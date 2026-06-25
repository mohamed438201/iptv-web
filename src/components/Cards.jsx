import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDownloads } from '../contexts/DownloadsContext';
import './Cards.css';

// Global cache and queue for metadata
window.metaCache = window.metaCache || new Map();
window.metaQueue = window.metaQueue || [];
window.isMetaProcessing = window.isMetaProcessing || false;

const processMetaQueue = async () => {
  if (window.isMetaProcessing || window.metaQueue.length === 0) return;
  window.isMetaProcessing = true;

  while (window.metaQueue.length > 0) {
    const task = window.metaQueue.shift();
    const { id, type, xtreamData, onResult } = task;

    if (window.metaCache.has(`${type}_${id}`)) {
      if (onResult) onResult(window.metaCache.get(`${type}_${id}`));
      continue;
    }

    if (!xtreamData) continue;

    try {
      const action = type === 'series' ? 'get_series_info' : 'get_vod_info';
      const idParam = type === 'series' ? `&series_id=${id}` : `&vod_id=${id}`;
      const url = `${xtreamData.server_url}/player_api.php?username=${xtreamData.username}&password=${xtreamData.password}&action=${action}${idParam}`;
      
      let res;
      if (window.electronAPI) {
        res = await window.electronAPI.fetchApi(url);
      } else {
        const response = await fetch(url);
        res = await response.json();
      }

      let resultText = '';
      if (type === 'series' && res.episodes) {
        let total = 0;
        Object.values(res.episodes).forEach(season => {
          total += Array.isArray(season) ? season.length : 0;
        });
        resultText = `${total} Episodes`;
      } else if (type !== 'series' && res.info && res.info.duration) {
        const d = res.info.duration; // "01:32:13" or "130"
        if (d.includes(':')) {
          const parts = d.split(':');
          if (parts.length >= 2) {
            const h = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            resultText = h > 0 ? `${h}h ${m}m` : `${m}m`;
          }
        } else {
          resultText = `${d}m`;
        }
      }

      if (resultText) {
        window.metaCache.set(`${type}_${id}`, resultText);
        if (onResult) onResult(resultText);
      }
    } catch (e) {
      console.warn('Failed meta fetch', e);
    }

    // Rate limiting: wait 200ms between requests
    await new Promise(r => setTimeout(r, 200));
  }

  window.isMetaProcessing = false;
};

const CardMeta = ({ item, type, xtreamData }) => {
  const id = item.stream_id || item.series_id || item.id;
  const cached = window.metaCache.get(`${type}_${id}`);
  const [metaText, setMetaText] = useState(cached || '');
  const ref = useRef(null);

  useEffect(() => {
    if (cached) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          window.metaQueue.push({
            id,
            type,
            xtreamData,
            onResult: (text) => setMetaText(text)
          });
          processMetaQueue();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [id, type, xtreamData, cached]);

  return <span ref={ref} className="extra">{metaText || (type === 'series' ? 'Series' : 'Movie')}</span>;
};

export function UniversalCard({ item, onClick, renderActions }) {
  const { activeProfile, toggleCollection, user } = useAuth();
  const { getDownloadState } = useDownloads();
  const xtreamData = user?.xtreamData;
  
  const fallbackName = encodeURIComponent(item.name || 'TV');
  const fallbackImage = `https://ui-avatars.com/api/?name=${fallbackName}&background=111111&color=ffffff&size=512&font-size=0.3`;
  const imageSrc = item.stream_icon || item.cover || fallbackImage;
  const year = item.year || item.added?.substring(0,4) || '2023';
  const ratingText = item.rating ? `${item.rating} • ` : '';
  
  const streamId = String(item.series_id || item.stream_id || item.id);
  const inCollection = activeProfile?.library?.some(l => l.stream_id === streamId && l.in_collection);

  return (
    <div className="netflix-universal-card" onClick={() => onClick(item)}>
      <div className="u-card-image-wrapper">
        <img src={imageSrc} alt={item.name} loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/250x350/111111/FFFFFF?text=No+Image' }} />
      </div>
      <div className="u-card-body">
        <div className="u-card-header">
          <h3 className="u-card-title">{item.name}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(() => {
              if (item._type === 'live') return <span className="live-badge-mini">LIVE</span>;
              const dlState = getDownloadState(streamId);
              if (dlState?.status === 'downloading') {
                return (
                  <div style={{ position: 'relative', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Downloading...">
                    <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', top: 0, left: 0 }}>
                      <circle cx="10" cy="10" r="9" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
                      <circle cx="10" cy="10" r="9" stroke="#fff" strokeWidth="1.5" fill="none" strokeDasharray={56.5} strokeDashoffset={56.5 - (dlState.progress / 100) * 56.5} transform="rotate(-90 10 10)" style={{ transition: 'stroke-dashoffset 0.3s' }} />
                    </svg>
                  </div>
                );
              }
              if (dlState?.status === 'paused') {
                return <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1px solid #ff9500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '6px', height: '6px', backgroundColor: '#ff9500', borderRadius: '1px' }} /></div>;
              }
              if (dlState?.status === 'completed') {
                return <Check size={16} color="#46d369" title="Downloaded" />;
              }
              return null;
            })()}
            {renderActions ? renderActions() : (
              <button 
                className={`u-card-add-btn ${inCollection ? 'active' : ''}`} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  toggleCollection(streamId, item);
                }}
              >
                {inCollection ? <Check size={14} className="icon-anim-check" /> : <Plus size={14} className="icon-anim-plus" />}
              </button>
            )}
          </div>
        </div>
        <div className="u-card-meta">
          <span className="year">{year}</span>
          <span className="dot">•</span>
          {ratingText && <span className="rating">{ratingText.replace(' • ', '')}</span>}
          {ratingText && <span className="dot">•</span>}
          {item._type !== 'live' && <CardMeta item={item} type={item._type || 'vod'} xtreamData={xtreamData} />}
        </div>
        <p className="u-card-desc">
          {item.plot || item.description || "Explore this amazing content with high quality streaming. The perfect blend of action and story."}
        </p>
        <div className="u-card-genres">
          Action • Adventure • Sci-Fi
        </div>
      </div>
    </div>
  );
}
