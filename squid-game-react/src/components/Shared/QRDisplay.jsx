import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

export default function QRDisplay({ url, roomCode }) {
  return (
    <div className="qr-card">
      <div className="qr-badge">
        <QrCode size={13} color="#57ffb0" />
        <span>SCAN TO JOIN</span>
      </div>

      <div className="qr-box-outer">
        <div className="qr-box">
          <QRCodeSVG
            value={url}
            size={220}
            fgColor="#06120f"
            bgColor="#fdfbf5"
            level="M"
            includeMargin={true}
          />
        </div>
      </div>

      <div className="room-badge">
        <span className="room-label">ROOM :</span>
        <strong className="room-code-val">{roomCode}</strong>
      </div>
    </div>
  );
}
