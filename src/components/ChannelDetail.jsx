import React, { useState, useEffect } from 'react';
import { Play, Bookmark, Download, Share, Loader2 } from 'lucide-react';

export default function ChannelDetail({ item, server, onBack, onPlay }) {
  const [seriesInfo, setSeriesInfo] = useState(null);
  const [vodInfo, setVodInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item.type === 'series' && server) {
      fetchSeriesInfo();
    } else if (item.type === 'vod' && server) {
      fetchVodInfo();
    }
  }, [item]);

  const fetchSeriesInfo = async () => {
    setLoading(true);
    try {
      const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
      const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const useProxy = !isNativeApp || (isNativeApp && isDev && !window.Capacitor);
      const baseUrl = useProxy ? server.proxy : server.host;
      const url = `${baseUrl}/player_api.php?username=${server.user}&password=${server.pass}&action=get_series_info&series_id=${item.series_id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSeriesInfo(data.info);
        const eps = [];
        if (data.episodes) {
          Object.values(data.episodes).forEach(season => {
            eps.push(...season);
          });
        }
        setEpisodes(eps);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchVodInfo = async () => {
    setLoading(true);
    try {
      const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
      const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const useProxy = !isNativeApp || (isNativeApp && isDev && !window.Capacitor);
      const baseUrl = useProxy ? server.proxy : server.host;
      const url = `${baseUrl}/player_api.php?username=${server.user}&password=${server.pass}&action=get_vod_info&vod_id=${item.stream_id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVodInfo(data.info);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (!item) return null;

  const imageSrc = item.stream_icon || item.cover || `https://placehold.co/256x384/111111/FFFFFF?text=No+Image`;

  const handleImageError = (e) => {
    if (e.target.dataset.error) return;
    e.target.dataset.error = true;
    e.target.src = 'https://placehold.co/256x384/111111/FFFFFF?text=No+Image';
  };

  const handlePlayEpisode = (ep) => {
    const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
    const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const useProxy = !isNativeApp || (isNativeApp && isDev && !window.Capacitor);
    const baseUrl = useProxy ? server.proxy : server.host;
    const playUrl = `${baseUrl}/series/${server.user}/${server.pass}/${ep.id}.${ep.container_extension || 'mp4'}`;
    const enhancedItem = {
      ...ep,
      url: playUrl,
      type: 'series',
      name: ep.title,
      logo: ep.info?.movie_image || imageSrc
    };
    onPlay(enhancedItem);
  };

  return (
    <div className="detail-screen" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Background Layer */}
      <div className="detail-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '50%', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <img src={imageSrc} alt="bg" onError={handleImageError} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, filter: 'blur(30px) saturate(150%)', transform: 'scale(1.1)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, var(--bg-main) 100%)' }}></div>
      </div>

      {/* Back Button */}
      <button className="back-btn" onClick={onBack} style={{ top: '32px', right: '32px', zIndex: 50, position: 'absolute', background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="back-btn-icon">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      {/* Main Content Overlay */}
      <div className="detail-layout" style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'row', gap: '48px', padding: '64px', maxWidth: '1600px', width: '100%', margin: '0 auto', overflowY: 'auto' }}>
        
        {/* Right Column: Poster & Actions */}
        <div className="detail-sidebar" style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
          <img 
            src={imageSrc} 
            alt="Cover" 
            style={{ width: '100%', aspectRatio: '2/3', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
            onError={handleImageError} 
          />
          
          {item.type === 'vod' && (
            <button className="play-main-btn" onClick={() => onPlay(item)} style={{ width: '100%', background: 'var(--accent)', color: 'white', padding: '18px', borderRadius: '12px', fontSize: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'transform 0.2s, background 0.2s', marginTop: '0' }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-hover)'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent)'} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <Play fill="white" size={24} />
              شاهد الفيلم
            </button>
          )}

          <div className="action-buttons" style={{ display: 'flex', gap: '12px', padding: 0, margin: 0, justifyContent: 'space-between' }}>
            <button className="action-btn" style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              <Bookmark size={20} /> <span style={{color: 'white', fontSize: '14px'}}>قائمتي</span>
            </button>
            <button className="action-btn" style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              <Share size={20} /> <span style={{color: 'white', fontSize: '14px'}}>مشاركة</span>
            </button>
          </div>
        </div>

        {/* Left Column: Info & Episodes */}
        <div className="detail-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: '900', marginBottom: '16px', textShadow: '0 4px 12px rgba(0,0,0,0.5)', lineHeight: 1.1, color: 'white' }}>{item.name}</h1>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '16px', color: '#ccc', fontWeight: '600' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>{item.type === 'vod' ? 'فيلم' : 'مسلسل'}</span>
              <span>HD</span>
              {item.rating && <span>⭐ {item.rating}</span>}
              {vodInfo?.releasedate && <span>📅 {vodInfo.releasedate}</span>}
            </div>
          </div>

          <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#e5e5e5', background: 'rgba(0,0,0,0.5)', padding: '32px', borderRadius: '16px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <p style={{ marginBottom: '24px', fontSize: '18px' }}>{seriesInfo?.plot || vodInfo?.plot || item.plot || 'لا يوجد وصف متاح لهذا العرض.'}</p>
            {item.type === 'vod' && vodInfo && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '15px', color: '#aaa', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                {vodInfo.director && <div><strong style={{color: 'white'}}>المخرج:</strong> {vodInfo.director}</div>}
                {vodInfo.genre && <div><strong style={{color: 'white'}}>التصنيف:</strong> {vodInfo.genre}</div>}
                {vodInfo.cast && <div style={{ gridColumn: '1 / -1' }}><strong style={{color: 'white'}}>الممثلون:</strong> {vodInfo.cast}</div>}
              </div>
            )}
          </div>

          {item.type === 'series' && (
            <div className="episodes-section">
              <h3 style={{ fontSize: '28px', marginBottom: '32px', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '16px', display: 'inline-block' }}>الحلقات</h3>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                  <Loader2 className="spinner" size={48} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {episodes.map((ep, idx) => (
                    <div key={idx} onClick={() => handlePlayEpisode(ep)} style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.05)' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                      <div style={{ position: 'relative', width: '130px', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', background: '#111', flexShrink: 0 }}>
                        <img src={ep.info?.movie_image || imageSrc} alt={ep.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', transition: 'background 0.2s' }}>
                          <Play size={28} fill="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', marginBottom: '6px', lineHeight: '1.4' }}>{ep.title}</h4>
                        <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold' }}>الحلقة {ep.episode_num}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
