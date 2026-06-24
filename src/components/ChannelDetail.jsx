import React, { useState, useEffect } from 'react';
import { Play, Bookmark, Share, Loader2, ArrowRight } from 'lucide-react';
import { getTmdbDetails } from '../services/tmdb';
import './ChannelDetail.css';

export default function ChannelDetail({ item, server, onBack, onPlay }) {
  const [seriesInfo, setSeriesInfo] = useState(null);
  const [vodInfo, setVodInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [seasons, setSeasons] = useState({});
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tmdbData, setTmdbData] = useState(null);

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
                <button className="btn-watch-primary" onClick={() => onPlay(item)}>
                  <Play fill="black" size={24} /> Play Movie
                </button>
              )}
              {item.type === 'series' && episodes.length > 0 && (
                <button className="btn-watch-primary" onClick={() => handlePlayEpisode(episodes[0])}>
                  <Play fill="black" size={24} /> Play S1:E1
                </button>
              )}
              <button className="btn-action-circle" title="My List">
                <Bookmark size={24} />
              </button>
              <button className="btn-action-circle" title="Share">
                <Share size={24} />
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
