import React, { useState, useEffect } from 'react';
import { Play, Bookmark, Share, Loader2, ArrowRight, ThumbsUp, ThumbsDown, Plus, Check, Download } from 'lucide-react';
import { getTmdbDetails } from '../services/tmdb';
import { useAuth } from '../contexts/AuthContext';
import { useDownloads } from '../contexts/DownloadsContext';
import './ChannelDetail.css';

export default function ChannelDetail({ item, server, onBack, onPlay }) {
  const { activeProfile, toggleRating, toggleCollection } = useAuth();
  const { getDownloadState, startDownload, pauseDownload } = useDownloads();
  const [seriesInfo, setSeriesInfo] = useState(null);
  const [vodInfo, setVodInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [seasons, setSeasons] = useState({});
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tmdbData, setTmdbData] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', isError: false });

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    if (item.type === 'series' && server) {
      fetchSeriesInfo();
    } else if (item.type === 'vod' && server) {
      fetchVodInfo();
    }

    if (item) {
      getTmdbDetails(item, item.type).then(data => {
        if (data) setTmdbData(data);
      });
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
        if (data.episodes) {
          setSeasons(data.episodes);
          const seasonKeys = Object.keys(data.episodes);
          if (seasonKeys.length > 0) {
            setSelectedSeason(seasonKeys[0]);
            setEpisodes(data.episodes[seasonKeys[0]]);
          }
        }
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

  const backdropSrc = tmdbData?.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` 
    : '';

  const posterSrc = tmdbData?.poster_path 
    ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` 
    : (item.stream_icon || item.cover || `https://placehold.co/256x384/111111/FFFFFF?text=No+Image`);

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
      logo: ep.info?.movie_image || posterSrc
    };
    onPlay(enhancedItem, episodes, { 
      ...(seriesInfo || {}), 
      series_id: item.series_id,
      cover: posterSrc 
    });
  };

  const handleDownloadVod = () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      return showToast('Downloads are only supported in the desktop app.', true);
    }
    
    const streamId = String(item.stream_id || item.id);
    const dlState = getDownloadState(streamId);
    
    if (dlState?.status === 'downloading') {
      pauseDownload(streamId);
      return;
    }
    if (dlState?.status === 'paused') {
      startDownload(dlState);
      return;
    }
    if (dlState?.status === 'completed') {
      return;
    }

    let ext = item.container_extension || 'mp4';
    const baseUrl = server.host;
    const downloadUrl = `${baseUrl}/movie/${server.user}/${server.pass}/${item.stream_id}.${ext}`;
    
    startDownload({
      ...item,
      url: downloadUrl,
      title: titleText,
      poster: posterSrc
    });
    showToast('Download started! Check the Downloads page.');
  };

  const handleDownloadEpisode = (ep) => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      return showToast('Downloads are only supported in the desktop app.', true);
    }
    
    const streamId = String(ep.id);
    const dlState = getDownloadState(streamId);
    
    if (dlState?.status === 'downloading') {
      pauseDownload(streamId);
      return;
    }
    if (dlState?.status === 'paused') {
      startDownload(dlState);
      return;
    }
    if (dlState?.status === 'completed') {
      return;
    }

    const baseUrl = server.host;
    const downloadUrl = `${baseUrl}/series/${server.user}/${server.pass}/${ep.id}.${ep.container_extension || 'mp4'}`;
    
    startDownload({
      ...ep,
      url: downloadUrl,
      type: 'series',
      title: `${titleText} - S${ep.season || selectedSeason} E${ep.episode_num}: ${ep.title}`,
      poster: ep.info?.movie_image || posterSrc
    });
    showToast('Download started! Check the Downloads page.');
  };

  const handleDownloadSeason = () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      return showToast('Downloads are only supported in the desktop app.', true);
    }
    if (episodes.length === 0) return;
    
    showToast(`Downloading ${episodes.length} episodes of Season ${selectedSeason}...`);
    
    episodes.forEach((ep, index) => {
      setTimeout(() => {
        const streamId = String(ep.id);
        const dlState = getDownloadState(streamId);
        if (dlState) return; // already downloaded/downloading

        let ext = ep.container_extension || 'mp4';
        const baseUrl = server.host;
        const downloadUrl = `${baseUrl}/series/${server.user}/${server.pass}/${ep.id}.${ext}`;
        
        startDownload({
          ...ep,
          url: downloadUrl,
          type: 'series',
          title: `${titleText} - S${ep.season || selectedSeason} E${ep.episode_num}: ${ep.title}`,
          poster: ep.info?.movie_image || posterSrc
        });
      }, index * 500);
    });
  };

  const handleSeasonChange = (e) => {
    const season = e.target.value;
    setSelectedSeason(season);
    setEpisodes(seasons[season] || []);
  };

  const formatDuration = (ep) => {
    if (ep.info?.duration) {
      const dur = String(ep.info.duration);
      if (dur.includes(':')) {
        const parts = dur.split(':');
        if (parts.length === 3) {
          const hrs = parseInt(parts[0], 10);
          const mins = parseInt(parts[1], 10);
          if (hrs > 0) return `${hrs}h ${mins}m`;
          return `${mins}m`;
        }
      }
      if (!isNaN(dur)) return `${dur}m`;
      return dur;
    }
    return '';
  };

  const plot = tmdbData?.overview || seriesInfo?.plot || vodInfo?.plot || item.plot || 'No description available.';
  const rating = tmdbData?.vote_average ? tmdbData.vote_average.toFixed(1) : (item.rating || null);
  const year = tmdbData?.release_date?.substring(0,4) || tmdbData?.first_air_date?.substring(0,4) || vodInfo?.releasedate || item.year || '';

  const titleText = item.name || item.title || item.name;
  const isArabicText = (text) => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
  };
  const isArabic = isArabicText(titleText);
  const titleFont = isArabic ? "'Cairo', sans-serif" : "'Bebas Neue', sans-serif";
  const titleSpacing = isArabic ? "normal" : "2px";

  return (
    <div className="netflix-detail-screen">
      {/* Background Hero Layer */}
      <div className="detail-hero-bg">
        {backdropSrc ? (
          <img src={backdropSrc} alt="bg" className="backdrop-img" />
        ) : (
          <img src={posterSrc} alt="bg" className="fallback-bg-img" onError={handleImageError} />
        )}
        <div className="detail-vignette"></div>
      </div>

      {/* Back Button */}
      <button className="netflix-back-btn" onClick={onBack}>
        <ArrowRight size={28} />
      </button>

      {/* Main Content Layout */}
      <div className="detail-content-container">
        
        {/* Top Hero Section */}
        <div className="detail-hero-section">
          <div className="detail-hero-info">
            <h1 className="detail-title" style={{ fontFamily: titleFont, letterSpacing: titleSpacing, textTransform: isArabic ? 'none' : 'uppercase' }}>
              {titleText}
            </h1>
            
            <div className="detail-metadata">
              <span className="match-score">100% Match</span>
              {year && <span className="meta-year">{year}</span>}
              <span className="meta-age">16+</span>
              <span className="meta-hd">HD</span>
              {rating && (
                <span className="meta-rating" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ backgroundColor: '#f5c518', color: 'black', padding: '0 4px', borderRadius: '3px', fontWeight: '900', fontSize: '12px' }}>IMDb</span>
                  {rating}
                </span>
              )}
            </div>

            <p className="detail-synopsis">{plot}</p>

            <div className="detail-hero-actions">
              {item.type === 'vod' && (
                <>
                  <button className="btn-watch-primary" onClick={() => onPlay(item)}>
                    <Play fill="black" size={24} /> Play Movie
                  </button>
                </>
              )}
              {item.type === 'series' && episodes.length > 0 && (
                <>
                  <button className="btn-watch-primary" onClick={() => handlePlayEpisode(episodes[0])}>
                    <Play fill="black" size={24} /> Play S1:E1
                  </button>
                </>
              )}
              
              {(() => {
                const streamId = String(item?.series_id || item?.stream_id || item?.id);
                const libItem = activeProfile?.library?.find(l => l.stream_id === streamId) || {};
                
                return (
                  <>
                    <button 
                      className={`btn-action-circle ${libItem.rating === 'dislike' ? 'active-rating' : ''}`} 
                      onClick={(e) => { e.stopPropagation(); toggleRating(streamId, item, 'dislike'); }}
                      style={{ backgroundColor: libItem.rating === 'dislike' ? 'rgba(255,255,255,0.2)' : undefined }}
                    ><ThumbsDown size={24} fill={libItem.rating === 'dislike' ? 'white' : 'none'} /></button>
                    
                    <button 
                      className="btn-action-circle" 
                      onClick={(e) => { e.stopPropagation(); toggleCollection(streamId, item); }}
                    >
                      {libItem.in_collection ? <Check size={24} className="icon-anim-check" /> : <Plus size={24} className="icon-anim-plus" />}
                    </button>
                    
                    <button 
                      className={`btn-action-circle ${libItem.rating === 'like' ? 'active-rating' : ''}`} 
                      onClick={(e) => { e.stopPropagation(); toggleRating(streamId, item, 'like'); }}
                      style={{ backgroundColor: libItem.rating === 'like' ? 'rgba(255,255,255,0.2)' : undefined }}
                    ><ThumbsUp size={24} fill={libItem.rating === 'like' ? 'white' : 'none'} /></button>
                  </>
                );
              })()}
              
              <button className="btn-action-circle" title="Download" onClick={item.type === 'vod' ? handleDownloadVod : handleDownloadSeason} style={{ padding: 0 }}>
                {(() => {
                  const streamId = String(item?.stream_id || item?.id);
                  const dlState = getDownloadState(streamId);
                  if (item.type === 'vod' && dlState?.status === 'downloading') {
                    return (
                      <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', top: 0, left: 0 }}>
                          <circle cx="22" cy="22" r="20" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" />
                          <circle cx="22" cy="22" r="20" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray={125.6} strokeDashoffset={125.6 - (dlState.progress / 100) * 125.6} transform="rotate(-90 22 22)" style={{ transition: 'stroke-dashoffset 0.3s' }} />
                        </svg>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#fff', borderRadius: '2px' }} /> {/* Pause icon */}
                      </div>
                    );
                  }
                  if (item.type === 'vod' && dlState?.status === 'paused') {
                    return <Play size={20} fill="white" />;
                  }
                  if (item.type === 'vod' && dlState?.status === 'completed') {
                    return <Check size={24} className="icon-anim-check" />;
                  }
                  return <Download size={24} />;
                })()}
              </button>
            </div>

            {item.type === 'vod' && vodInfo && (
              <div className="detail-cast-info">
                {vodInfo.director && <p><span className="cast-label">Director:</span> {vodInfo.director}</p>}
                {vodInfo.genre && <p><span className="cast-label">Genre:</span> {vodInfo.genre}</p>}
                {vodInfo.cast && <p><span className="cast-label">Cast:</span> {vodInfo.cast}</p>}
              </div>
            )}
          </div>

          <div className="detail-hero-poster">
            <img src={posterSrc} alt="Cover" onError={handleImageError} className="small-poster-img" />
          </div>
        </div>

        {/* Episodes Section */}
        {item.type === 'series' && (
          <div className="detail-episodes-section">
            <div className="episodes-header">
              <h2>Episodes</h2>
              {Object.keys(seasons).length > 1 && (
                <select 
                  className="season-selector"
                  value={selectedSeason || ''}
                  onChange={handleSeasonChange}
                >
                  {Object.keys(seasons).map(s => (
                    <option key={s} value={s}>Season {s}</option>
                  ))}
                </select>
              )}
            </div>
            
            {loading ? (
              <div className="episodes-loader">
                <Loader2 className="spinner" size={48} />
              </div>
            ) : (
              <div className="episodes-list">
                {episodes.map((ep, idx) => (
                  <div key={idx} className="episode-card" onClick={() => handlePlayEpisode(ep)}>
                    <div className="episode-number">{ep.episode_num}</div>
                    <div className="episode-thumb">
                      <img src={ep.info?.movie_image || posterSrc} alt={ep.title} onError={handleImageError} />
                      <div className="episode-play-overlay">
                        <Play size={24} fill="white" />
                      </div>
                    </div>
                    <div className="episode-info">
                      <h4 style={{ fontFamily: isArabicText(ep.title) ? "'Cairo', sans-serif" : "'Inter', sans-serif" }}>{ep.title}</h4>
                      <p>{ep.info?.plot || 'Episode ' + ep.episode_num}</p>
                    </div>
                    {formatDuration(ep) && (
                      <div className="episode-duration">{formatDuration(ep)}</div>
                    )}
                    <button className="ep-download-btn" onClick={(e) => { e.stopPropagation(); handleDownloadEpisode(ep); }} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', padding: '8px', marginLeft: 'auto' }} title="Download Episode">
                      {(() => {
                        const dlState = getDownloadState(ep.id);
                        if (dlState?.status === 'downloading') {
                          return (
                            <div style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="32" height="32" viewBox="0 0 32 32" style={{ position: 'absolute', top: 0, left: 0 }}>
                                <circle cx="16" cy="16" r="14" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" />
                                <circle cx="16" cy="16" r="14" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray={88} strokeDashoffset={88 - (dlState.progress / 100) * 88} transform="rotate(-90 16 16)" style={{ transition: 'stroke-dashoffset 0.3s' }} />
                              </svg>
                              <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '1px' }} /> {/* Pause icon */}
                            </div>
                          );
                        }
                        if (dlState?.status === 'paused') {
                          return <Play size={16} fill="white" />;
                        }
                        if (dlState?.status === 'completed') {
                          return <Check size={20} color="#46d369" />;
                        }
                        return <Download size={20} />;
                      })()}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <div className={`toast-notification ${toast.show ? 'show' : ''}`}>
        <div className="toast-icon" style={{ background: toast.isError ? '#ff3b30' : '#46d369' }}>
          {toast.isError ? <ThumbsDown size={16} fill="white" /> : <Check size={16} color="white" />}
        </div>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
