import React, { createContext, useContext, useState, useEffect } from 'react';

const DownloadsContext = createContext();

export function useDownloads() {
  return useContext(DownloadsContext);
}

export function DownloadsProvider({ children }) {
  const [downloads, setDownloads] = useState({});

  useEffect(() => {
    if (!window.electronAPI) return;

    const fetchDownloads = async () => {
      const data = await window.electronAPI.getDownloads();
      const downloadsMap = {};
      data.forEach(d => {
        downloadsMap[d.id] = d;
      });
      setDownloads(downloadsMap);
    };

    fetchDownloads();
    const interval = setInterval(fetchDownloads, 2000);

    window.electronAPI.onOfflineDownloadProgress((data) => {
      setDownloads(prev => {
        const id = String(data.id);
        const item = prev[id];
        if (!item) return prev;
        
        return {
          ...prev,
          [id]: {
            ...item,
            progress: data.progress,
            downloadedBytes: item.isHls ? item.downloadedBytes : data.downloadedLength,
            downloadedSegments: item.isHls ? data.downloadedLength : item.downloadedSegments,
            totalBytes: data.totalLength
          }
        };
      });
    });

    window.electronAPI.onOfflineDownloadComplete((data) => {
      setDownloads(prev => {
        const id = String(data.id);
        const item = prev[id];
        if (!item) return prev;
        return {
          ...prev,
          [id]: {
            ...item,
            status: 'completed',
            progress: 100
          }
        };
      });
    });

    return () => clearInterval(interval);
  }, []);

  const getDownloadState = (id) => {
    return downloads[String(id)] || null;
  };

  const startDownload = async (item) => {
    if (!window.electronAPI) return;
    await window.electronAPI.startDownload(item);
    // Optimistic update
    setDownloads(prev => ({
      ...prev,
      [item.stream_id || item.series_id || item.id]: {
        ...item,
        status: 'downloading',
        progress: 0
      }
    }));
  };

  const pauseDownload = async (id) => {
    if (!window.electronAPI) return;
    await window.electronAPI.pauseDownload(id);
    setDownloads(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        status: 'paused'
      }
    }));
  };

  const resumeDownload = async (item) => {
    await startDownload(item);
  };

  const removeDownload = async (id) => {
    if (!window.electronAPI) return;
    await window.electronAPI.removeDownload(id);
    setDownloads(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <DownloadsContext.Provider value={{ 
      downloads, 
      getDownloadState, 
      startDownload, 
      pauseDownload, 
      resumeDownload, 
      removeDownload 
    }}>
      {children}
    </DownloadsContext.Provider>
  );
}
