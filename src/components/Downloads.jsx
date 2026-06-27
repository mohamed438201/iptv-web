import React from 'react';
import { Play, Trash2, HardDrive, Download, AlertCircle, X, Pause, Folder } from 'lucide-react';
import { UniversalCard } from './Cards';
import { useDownloads } from '../contexts/DownloadsContext';
import { useDialog } from '../contexts/DialogContext';
import './Downloads.css';

export default function Downloads({ onItemSelect }) {
  const { downloads, pauseDownload, resumeDownload, removeDownload } = useDownloads();
  const { confirm } = useDialog();

  const handleRemove = async (id, e) => {
    e.stopPropagation();
    const isConfirmed = await confirm('Are you sure you want to cancel/delete this download?');
    if (isConfirmed) {
      await removeDownload(id);
    }
  };

  const handlePauseResume = async (item, e) => {
    e.stopPropagation();
    if (item.status === 'downloading') {
      await pauseDownload(item.id);
    } else if (item.status === 'paused' || item.status === 'error') {
      await resumeDownload(item);
    }
  };

  const handlePlay = (item) => {
    if (item.status !== 'completed') return;
    const offlineUrl = item.isHls 
      ? `http://127.0.0.1:12121/offline.m3u8?id=${item.id}`
      : `http://127.0.0.1:12121/offline?id=${item.id}`;
      
    const playableItem = {
      ...item,
      url: offlineUrl,
      isOffline: true
    };
    onItemSelect(playableItem, item.type || 'vod');
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!window.electronAPI) {
    return (
      <div className="downloads-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <HardDrive size={64} color="#666" style={{ marginBottom: '24px' }} />
        <h2 style={{ fontSize: '24px' }}>Downloads Unavailable</h2>
        <p style={{ color: '#aaa', marginTop: '12px' }}>Downloads are only supported in the desktop application.</p>
      </div>
    );
  }

  const downloadsList = Object.values(downloads);
  const activeDownloads = downloadsList.filter(d => d.status === 'downloading' || d.status === 'pending' || d.status === 'paused');
  const completedDownloads = downloadsList.filter(d => d.status === 'completed');
  const errorDownloads = downloadsList.filter(d => d.status === 'error');

  const isOffline = !navigator.onLine;

  return (
    <div className="downloads-page">
      {isOffline && (
        <div style={{ background: 'linear-gradient(90deg, #E50914, #ff4b4b)', color: 'white', padding: '16px 24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%' }}>
            <Download size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>You are Offline</h2>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>Enjoy your downloaded movies and shows without an internet connection.</p>
          </div>
        </div>
      )}
      <div className="downloads-header">
        <h1>My Downloads</h1>
        <p>Watch your downloaded movies and TV shows offline.</p>
      </div>

      {downloadsList.length === 0 ? (
        <div className="downloads-empty">
          <Download size={64} color="#333" />
          <h2>No downloads yet</h2>
          <p>Movies and shows you download will appear here.</p>
        </div>
      ) : (
        <>
          {(activeDownloads.length > 0 || errorDownloads.length > 0) && (
            <div className="active-downloads-section">
              <h2 className="section-title">Downloading & Paused</h2>
              <div className="active-downloads-list">
                {[...activeDownloads, ...errorDownloads].map(item => (
                  <div key={item.id} className="active-download-card-v2">
                    <div 
                      className="active-dl-v2-bg" 
                      style={{ backgroundImage: `url(${item.poster || 'https://placehold.co/256x384/111/fff?text=No+Image'})` }}
                    ></div>
                    <div className="active-dl-v2-overlay"></div>
                    
                    <div className="active-dl-v2-content">
                      <img 
                        src={item.poster || 'https://placehold.co/256x384/111/fff?text=No+Image'} 
                        alt={item.title} 
                        className="active-dl-v2-poster"
                        onError={(e) => { e.target.src = 'https://placehold.co/256x384/111/fff?text=No+Image'; }}
                      />
                      
                      <div className="active-dl-v2-body">
                        <div className="active-dl-v2-header">
                          <h3 className="active-dl-v2-title">{item.title || item.name}</h3>
                          <span className={`active-dl-v2-status ${item.status}`}>
                            {item.status === 'error' ? 'Failed' : item.status === 'paused' ? 'Paused' : 'Downloading'}
                          </span>
                        </div>
                        
                        <div className="active-dl-v2-progress-section">
                          <div className="active-dl-v2-progress-text">
                            <span className="v2-bytes">
                              {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}
                              {item.isHls && item.totalBytes === 0 ? ' (Calculating...)' : ''}
                            </span>
                            <span className="v2-percentage">
                              {Math.round(item.progress || 0)}%
                            </span>
                          </div>
                          <div className="v2-progress-track">
                            <div 
                              className={`v2-progress-fill ${item.status}`} 
                              style={{ width: `${item.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="active-dl-v2-actions">
                        <button 
                          className="v2-btn-action primary-action" 
                          onClick={(e) => handlePauseResume(item, e)} 
                          title={item.status === 'downloading' ? 'Pause' : 'Resume'}
                        >
                          {item.status === 'downloading' ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
                        </button>
                        
                        <button 
                          className="v2-btn-action danger-action" 
                          onClick={(e) => handleRemove(item.id, e)} 
                          title="Cancel Download"
                        >
                          <X size={24} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedDownloads.length > 0 && (
            <div className="completed-downloads-section">
              <h2 className="section-title">Completed</h2>
              <div className="completed-downloads-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                {completedDownloads.map(item => (
                  <UniversalCard 
                    key={item.id} 
                    item={{
                      ...item, 
                      name: item.title || item.name, 
                      cover: item.poster,
                      stream_id: item.id,
                      year: 'Downloaded'
                    }} 
                    onClick={() => handlePlay(item)}
                    renderActions={() => (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={(e) => handleRemove(item.id, e)}
                          style={{
                            background: 'rgba(255, 59, 48, 0.1)',
                            border: 'none',
                            color: '#ff3b30',
                            padding: '6px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          title="Delete Download"
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
