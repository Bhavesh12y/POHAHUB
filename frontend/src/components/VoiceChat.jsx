import { useState, useEffect, useRef } from 'react';
import { connectSocket } from '../lib/socket.js';

export default function VoiceChat({ roomCode }) {
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const localStream = useRef(null);
  const peers = useRef({});
  const remoteAudios = useRef({});
  // FIX 1: We need a queue to hold ICE candidates that arrive too early
  const pendingCandidates = useRef({}); 
  const socket = connectSocket();

  const speakerOnRef = useRef(speakerOn);
  useEffect(() => { speakerOnRef.current = speakerOn; }, [speakerOn]);

  const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  useEffect(() => {
    // FIX 2: Pass an isInitiator flag to prevent Offer Glare
    const createPeer = (peerId, isInitiator) => {
      const peer = new RTCPeerConnection(rtcConfig);
      peers.current[peerId] = peer;
      pendingCandidates.current[peerId] = []; // Initialize empty queue

      // Only the initiator sets up the initial receiver. The other player 
      // will automatically set theirs up when they answer the offer.
      if (isInitiator) {
        peer.addTransceiver('audio', { direction: 'recvonly' });
      }

      if (localStream.current) {
        localStream.current.getTracks().forEach(track => {
          peer.addTrack(track, localStream.current);
        });
      }

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice:signal', {
            targetId: peerId,
            signalData: { type: 'candidate', candidate: event.candidate }
          });
        }
      };

      peer.ontrack = (event) => {
        if (!remoteAudios.current[peerId]) {
          const audio = new Audio();
          audio.srcObject = event.streams[0] || new MediaStream([event.track]);
          audio.autoplay = true;
          audio.muted = !speakerOnRef.current;
          remoteAudios.current[peerId] = audio;

          audio.play().catch(err => {
            console.warn("Autoplay blocked. User interaction required:", err);
          });
        }
      };

      peer.onnegotiationneeded = async () => {
        if (peer.signalingState !== "stable") return; 
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit('voice:signal', { targetId: peerId, signalData: peer.localDescription });
        } catch (err) {
          console.error("Negotiation error:", err);
        }
      };

      return peer;
    };

    const handleUserJoined = ({ socketId }) => {
      // Because I am already in the room, I initiate the call with the newcomer
      createPeer(socketId, true);
    };

    const handleSignal = async ({ senderId, signalData }) => {
      let peer = peers.current[senderId];

      try {
        if (signalData.type === 'offer') {
          // Because I am receiving an offer, I am NOT the initiator
          if (!peer) peer = createPeer(senderId, false);

          await peer.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('voice:signal', { targetId: senderId, signalData: peer.localDescription });

          // FIX 3: Now that the remote description is set, flush any ICE candidates 
          // that got stuck waiting in the queue!
          if (pendingCandidates.current[senderId]) {
            for (const candidate of pendingCandidates.current[senderId]) {
              await peer.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current[senderId] = [];
          }
          
        } else if (signalData.type === 'answer') {
          if (peer) await peer.setRemoteDescription(new RTCSessionDescription(signalData));
          
        } else if (signalData.type === 'candidate') {
          // FIX 4: Prevent the "Error processing ICE candidate" crash
          if (!peer || !peer.remoteDescription || !peer.remoteDescription.type) {
            // The remote description isn't ready yet. Safely queue it.
            if (!pendingCandidates.current[senderId]) pendingCandidates.current[senderId] = [];
            pendingCandidates.current[senderId].push(signalData.candidate);
          } else {
            // It's safe to add it immediately
            await peer.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          }
        }
      } catch (err) {
        console.error("Signal handling error:", err);
      }
    };

    socket.on('voice:user_joined', handleUserJoined);
    socket.on('voice:signal', handleSignal);

    socket.emit('voice:join', { roomCode });

    return () => {
      socket.off('voice:user_joined', handleUserJoined);
      socket.off('voice:signal', handleSignal);
    };
  }, [roomCode]);

  useEffect(() => {
    return () => {
      Object.values(peers.current).forEach(peer => peer.close());
      peers.current = {};
      
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true } 
      });
      
      localStream.current = stream;
      setMicOn(true);

      Object.values(peers.current).forEach(peer => {
        stream.getTracks().forEach(track => {
          peer.addTrack(track, stream);
        });
      });
      
    } catch (err) {
      console.error("Failed to access microphone", err);
      alert("Microphone permission denied.");
    }
  };

  const toggleMic = () => {
    if (!localStream.current) {
      initVoice(); 
      return;
    }
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !micOn;
      setMicOn(!micOn);
    }
  };

  const toggleSpeaker = () => {
    const newState = !speakerOn;
    setSpeakerOn(newState);
    Object.values(remoteAudios.current).forEach(audio => {
      audio.muted = !newState;
    });
  };

  return (
    <div className="flex gap-3 bg-[#222] p-2 rounded-lg border-[3px] border-black shadow-[4px_4px_0px_#000]">
      <button
        onClick={toggleMic}
        className={`flex items-center justify-center w-10 h-10 rounded border-[2px] border-black transition-all shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000] ${
          micOn ? 'bg-[#facc15] text-black' : 'bg-red-500 text-white'
        }`}
        title={micOn ? "Mute Microphone" : "Unmute Microphone"}
      >
        {micOn ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
        )}
      </button>

      <button
        onClick={toggleSpeaker}
        className={`flex items-center justify-center w-10 h-10 rounded border-[2px] border-black transition-all shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000] ${
          speakerOn ? 'bg-[#3b82f6] text-white' : 'bg-red-500 text-white'
        }`}
        title={speakerOn ? "Deafen Speaker" : "Listen Speaker"}
      >
        {speakerOn ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
        )}
      </button>
    </div>
  );
}