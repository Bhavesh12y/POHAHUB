import { useState, useEffect, useRef } from 'react';
import { connectSocket } from '../lib/socket.js';

export default function VoiceChat({ roomCode }) {
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);

  const localStream = useRef(null);
  const peers = useRef({});
  const remoteAudios = useRef({});
  const socket = connectSocket();

  // Free Google STUN server to help peers find each other
  const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  useEffect(() => {
    if (!hasJoined) return;

    const createPeer = (peerId, initiator) => {
      const peer = new RTCPeerConnection(rtcConfig);
      peers.current[peerId] = peer;

      // Attach local microphone audio to the connection
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => {
          peer.addTrack(track, localStream.current);
        });
      }

      // Exchange network candidates to establish the P2P connection
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice:signal', {
            targetId: peerId,
            signalData: { type: 'candidate', candidate: event.candidate }
          });
        }
      };

      // Play remote audio when received
      peer.ontrack = (event) => {
        if (!remoteAudios.current[peerId]) {
          const audio = new Audio();
          audio.srcObject = event.streams[0];
          audio.autoplay = true;
          audio.muted = !speakerOn;
          remoteAudios.current[peerId] = audio;
        }
      };

      // The initiator creates the initial WebRTC offer
      if (initiator) {
        peer.createOffer().then(offer => {
          peer.setLocalDescription(offer);
          socket.emit('voice:signal', { targetId: peerId, signalData: offer });
        });
      }

      return peer;
    };

    const handleUserJoined = ({ socketId }) => {
      createPeer(socketId, true);
    };

    const handleSignal = async ({ senderId, signalData }) => {
      let peer = peers.current[senderId];
      if (!peer) peer = createPeer(senderId, false);

      if (signalData.type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signalData));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('voice:signal', { targetId: senderId, signalData: answer });
      } else if (signalData.type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signalData));
      } else if (signalData.type === 'candidate') {
        await peer.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    };

    socket.on('voice:user_joined', handleUserJoined);
    socket.on('voice:signal', handleSignal);

    return () => {
      socket.off('voice:user_joined', handleUserJoined);
      socket.off('voice:signal', handleSignal);
    };
  }, [hasJoined]);

  // Clean up media streams and connections if component unmounts
  useEffect(() => {
    return () => {
      Object.values(peers.current).forEach(peer => peer.close());
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      setMicOn(true);
      setHasJoined(true);
      socket.emit('voice:join', { roomCode });
    } catch (err) {
      console.error("Failed to access microphone", err);
      alert("Microphone permission denied.");
    }
  };

  const toggleMic = () => {
    if (!hasJoined) {
      initVoice(); // Ask for permission and join network on first click
      return;
    }
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !micOn; // Soft-mute without dropping the P2P connection
      setMicOn(!micOn);
    }
  };

  const toggleSpeaker = () => {
    const newState = !speakerOn;
    setSpeakerOn(newState);
    // Apply speaker mute/unmute to all active peers
    Object.values(remoteAudios.current).forEach(audio => {
      audio.muted = !newState;
    });
  };

  return (
    <div className="flex gap-3 bg-[#222] p-2 rounded-lg border-[3px] border-black shadow-[4px_4px_0px_#000]">
      {/* Mic Button */}
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

      {/* Speaker Button */}
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