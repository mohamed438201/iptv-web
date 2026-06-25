import React from 'react';
import { Play, Trash2, HardDrive, Download, AlertCircle, X, Pause, Folder } from 'lucide-react';
import { UniversalCard } from './Cards';
import { useDownloads } from '../contexts/DownloadsContext';
import './Downloads.css';

export default function Downloads({ onItemSelect }) {
  const { downloads, pauseDownload, resumeDownload, removeDownload } = useDownloads();

  const handleRemove = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to cancel/delete this download?')) {
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

  return (
    <div className="downloads-page">
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
                  <div key={item.id} className="active-download-card">
                    <img 
                      src={item.poster || 'https://placehold.co/256x384/111/fff?text=No+Image'} 
                      alt={item.title} 
                      className="active-dl-thumb"
                      onError={(e) => { e.target.src = 'https://placehold.co/256x384/111/fff?text=No+Image'; }}
                    />
                    <div className="active-dl-info">
                      <h3 className="active-dl-title">{item.title || item.name}</h3>
                      <div className="active-dl-meta">
                        <span>
                          {formatBytes(item.downloadedBytes)} of {formatBytes(item.totalBytes)}
                          {item.isHls && item.totalBytes === 0 ? ' (Calculating...)' : ''}
                        </span>
                        {item.status === 'error' ? (
                          <span style={{ color: '#ff3b30' }}>Failed</span>
                        ) : item.status === 'paused' ? (
                          <span style={{ color: '#ff9500' }}>Paused ({Math.round(item.progress || 0)}%)</span>
                        ) : (
                          <span className="active-dl-percentage">{Math.round(item.progress || 0)}%</span>
                        )}
                      </div>
                      <div className="progress-track">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${item.progress || 0}%`,
                            background: item.status === 'error' ? '#ff3b30' : item.status === 'paused' ? '#ff9500' : undefined
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="active-dl-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="pause-resume-btn" 
                        onClick={(e) => handlePauseResume(item, e)} 
                        title={item.status === 'downloading' ? 'Pause' : 'Resume'}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: 'none',
                          color: '#fff',
                          padding: '10px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        {item.status === 'downloading' ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
                      </button>
                      
                      <button 
                        className="cancel-btn" 
                        onClick={(e) => handleRemove(item.id, e)} 
                        title="Cancel Download"
                      >
                        <X size={24} />
                      </button>
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
