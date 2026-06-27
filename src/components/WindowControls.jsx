import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';
import './WindowControls.css';

export default function WindowControls() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsElectron(true);
    }
  }, []);

  if (!isElectron) return null;

  return (
    <div className="window-controls-container">
      <div className="window-controls-handle">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
      <div className="window-controls">
        <button 
          className="control-btn minimize" 
          onClick={() => window.electronAPI.minimizeWindow()}
          title="Minimize"
        >
          <Minus />
        </button>
        <button 
          className="control-btn maximize" 
          onClick={() => window.electronAPI.maximizeWindow()}
          title="Maximize/Restore"
        >
          <Square />
        </button>
        <button 
          className="control-btn close" 
          onClick={() => window.electronAPI.closeWindow()}
          title="Close"
        >
          <X />
        </button>
      </div>
    </div>
  );
}
