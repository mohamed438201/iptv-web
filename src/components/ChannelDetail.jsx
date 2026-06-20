import React, { useState, useEffect } from 'react';
import { Play, Bookmark, Download, Share, Loader2 } from 'lucide-react';

export default function ChannelDetail({ item, server, onBack, onPlay }) {
  const [seriesInfo, setSeriesInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item.type === 'series' && server) {
      fetchSeriesInfo();
    }
  }, [item]);

  const fetchSeriesInfo = async () => {
    setLoading(true);
    try {
      const baseUrl = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron')) ? server.host : server.proxy;
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

  if (!item) return null;

  const imageSrc = item.stream_icon || item.cover || `https://placehold.co/256x384/111111/FFFFFF?text=No+Image`;

  const handleImageError = (e) => {
    if (e.target.dataset.error) return;
    e.target.dataset.error = true;
    e.target.src = 'https://placehold.co/256x384/111111/FFFFFF?text=No+Image';
  };

  const handlePlayEpisode = (ep) => {
    const baseUrl = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron')) ? server.host : server.proxy;
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
    <div className="detail-screen">
      <button className="back-btn" onClick={onBack} style={{ top: '16px', right: '16px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="back-btn-icon">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div className="detail-layout" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="detail-hero" style={{ height: '60vh', minHeight: '400px' }}>
          <div className="detail-bg">
            <img src={imageSrc} alt="bg" onError={handleImageError} style={{ objectPosition: 'top' }} />
          </div>
          <div className="detail-gradient"></div>

          <div className="detail-content" style={{ paddingBottom: '24px' }}>
            <img 
              src={imageSrc} 
              alt="Cover" 
              className="detail-logo" 
              style={{ width: '120px', height: '180px', borderRadius: '8px', objectFit: 'cover' }}
              onError={handleImageError} 
            />
            <h2 className="detail-title" style={{ fontSize: '32px', marginTop: '16px' }}>{item.name}</h2>
            <p className="detail-meta">
              {item.type === 'vod' ? 'فيلم' : 'مسلسل'} • HD {item.rating ? `• ⭐ ${item.rating}` : ''}
            </p>

            {item.type === 'vod' && (
              <button className="play-main-btn" onClick={() => onPlay(item)}>
                <Play fill="black" size={20} />
                شاهد الفيلم
              </button>
            )}
          </div>
        </div>

        <div className="action-buttons">
          <button className="action-btn">
            <Bookmark size={20} />
            <span>قائمتي</span>
          </button>
          <button className="action-btn">
            <Share size={20} />
            <span>مشاركة</span>
          </button>
        </div>

        <div className="detail-description" style={{ padding: '0 24px' }}>
          {seriesInfo?.plot || item.plot || 'لا يوجد وصف متاح لهذا العرض.'}
        </div>

        {item.type === 'series' && (
          <div className="episodes-section" style={{ marginTop: '24px' }}>
            <div className="tabs-container">
              <div className="tab active">الحلقات</div>
            </div>
            
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <Loader2 className="spinner" size={32} />
              </div>
            ) : (
              <div className="episodes-list">
                {episodes.map((ep, idx) => (
                  <div key={idx} className="episode-item" onClick={() => handlePlayEpisode(ep)}>
                    <div className="episode-image-container">
                      <img src={ep.info?.movie_image || imageSrc} alt={ep.title} className="episode-image" onError={handleImageError} />
                      <div className="episode-play-icon"><Play size={12} fill="white" /></div>
                    </div>
                    <div className="episode-info">
                      <h4 className="episode-title">{ep.title}</h4>
                      <span className="episode-duration">الحلقة {ep.episode_num}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
