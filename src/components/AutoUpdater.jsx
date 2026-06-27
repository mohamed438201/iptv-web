import React, { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, CheckCircle } from 'lucide-react';
import './AutoUpdater.css';

export default function AutoUpdater() {
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, downloaded
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onCheckingForUpdate(() => {
      setUpdateStatus('checking');
    });

    window.electronAPI.onUpdateNotAvailable(() => {
      setUpdateStatus('idle');
    });

    window.electronAPI.onUpdateAvailable(() => {
      setUpdateStatus('available');
    });

    window.electronAPI.onDownloadProgress((event, percent) => {
      setUpdateStatus('downloading');
      setProgress(percent);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateStatus('downloaded');
    });

  }, []);

  if (updateStatus === 'idle' || updateStatus === 'checking') return null;

  return (
    <div className="updater-overlay fade-in">
      <div className="updater-card">
        {updateStatus === 'available' && (
          <>
            <DownloadCloud size={32} color="#E50914" className="updater-icon pulse" />
            <div className="updater-text">
              <h3>تحديث جديد متاح!</h3>
              <p>جاري تحضير التحميل...</p>
            </div>
          </>
        )}
        
        {updateStatus === 'downloading' && (
          <>
            <DownloadCloud size={32} color="#E50914" className="updater-icon" />
            <div className="updater-text" style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>جاري تحميل التحديث...</h3>
              <div className="progress-bar-bg" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                <div className="progress-bar-fill" style={{ width: `${progress}%`, height: '100%', background: '#E50914', transition: 'width 0.3s' }}></div>
              </div>
              <p className="progress-text" style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>{Math.round(progress)}%</p>
            </div>
          </>
        )}

        {updateStatus === 'downloaded' && (
          <>
            <CheckCircle size={32} color="#4CAF50" className="updater-icon" />
            <div className="updater-text">
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>تم التحميل بنجاح!</h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#ccc' }}>التحديث جاهز، يرجى إعادة تشغيل التطبيق لتثبيته.</p>
              <button className="updater-btn" onClick={() => window.electronAPI.restartApp()} style={{ background: '#E50914', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <RefreshCw size={16} /> تثبيت الآن
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
