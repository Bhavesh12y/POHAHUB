import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function QrScannerModal({ isOpen, onClose, onScan }) {
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleScan = (detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0) return;
    const rawValue = detectedCodes[0].rawValue || '';
    if (!rawValue) return;

    // Parse URL or raw room code
    let code = rawValue.trim();
    if (code.includes('/room/')) {
      const parts = code.split('/room/');
      code = parts[parts.length - 1].split('?')[0].split('/')[0];
    } else if (code.includes('join=')) {
      const match = code.match(/join=([A-Za-z0-9]+)/);
      if (match) code = match[1];
    } else if (code.includes('/')) {
      const parts = code.split('/');
      code = parts[parts.length - 1];
    }

    code = code.toUpperCase().slice(0, 8);
    if (code) {
      onScan(code);
      onClose();
    }
  };

  const handleError = (err) => {
    console.error('QR Scanner error:', err);
    setError('Camera permission denied or camera unavailable.');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white border-[4px] border-black rounded-xl p-5 shadow-[10px_10px_0px_#000] -rotate-1 text-black">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b-[3px] border-black pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <h3 className="text-lg font-black uppercase tracking-wider">Scan Room QR</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-red-500 text-white font-black rounded border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
          >
            ✕
          </button>
        </div>

        {/* Camera View Area */}
        <div className="relative w-full aspect-square bg-black border-[3px] border-black rounded-lg overflow-hidden mb-4 shadow-inner">
          <Scanner
            onScan={handleScan}
            onError={handleError}
            formats={['qr_code']}
            styles={{
              container: { width: '100%', height: '100%' },
              video: { width: '100%', height: '100%', objectFit: 'cover' }
            }}
          />
          {/* Overlay Corner Reticle */}
          <div className="absolute inset-4 border-2 border-dashed border-[#facc15] pointer-events-none rounded-lg flex items-center justify-center">
            <span className="bg-black/60 text-[#facc15] text-[10px] uppercase font-black px-2 py-1 rounded">
              Align QR Code here
            </span>
          </div>
        </div>

        {error ? (
          <p className="text-xs font-black text-red-600 mb-3 text-center">{error}</p>
        ) : (
          <p className="text-xs font-bold text-gray-700 text-center mb-3 uppercase">
            Point camera at the host's screen to join automatically!
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gray-200 text-black font-black uppercase tracking-wider rounded border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-y-0.5 hover:translate-x-0.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
