import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize, Minimize, ArrowLeft, Loader2, AlertCircle, Volume2, VolumeX, RotateCcw, RotateCw, Copy, MessageSquare, ChevronDown, X, SkipForward } from 'lucide-react';
import Hls from 'hls.js';
import { useAuth } from '../contexts/AuthContext';
import { saveContinueWatching } from '../services/db';
import './Player.css';

export default function Player({ channel, episodes = [], seriesInfo = null, onPlayEpisode, onBack }) {
  const { user, activeProfile } = useAuth();
  
  // Trigger HMR
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const lastSavedTimeRef = useRef(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [showEpisodesPanel, setShowEpisodesPanel] = useState(false);

  const controlsTimeoutRef = useRef(null);

  const handleInteraction = () => {
    if (showEpisodesPanel) return; // Keep controls visible if panel is open
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showEpisodesPanel) setShowControls(false);
    }, 4000);
  };

  // Close panel if clicked outside
  const handleOverlayClick = (e) => {
    if (showEpisodesPanel) {
      setShowEpisodesPanel(false);
    } else {
      togglePlay(e);
    }
  };

  useEffect(() => {
    if (!channel || !channel.url) return;

    setIsLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);

    const video = videoRef.current;
    let finalUrl = channel.url;
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isMp4OrMkv = finalUrl.includes('.mp4') || finalUrl.includes('.mkv') || finalUrl.includes('.avi');
    
    if (finalUrl.endsWith('.ts')) {
      finalUrl = finalUrl.replace(/\.ts$/, '.m3u8');
    }

    const attemptPlay = () => {
      setIsLoading(false);
      
      // Resume playback
      if (channel.progress && channel.progress > 0) {
        video.currentTime = channel.progress;
      }

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(e => {
             console.error("Play interrupted:", e);
             setIsPlaying(false);
          });
      }
    };

    if (isMp4OrMkv) {
      video.src = finalUrl;
      video.onloadedmetadata = attemptPlay;
      video.onerror = () => {
        setIsLoading(false);
        setErrorMsg("تعذر التشغيل (غير مدعوم أو لا يوجد اتصال)");
      };
    } else {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 100 * 1024 * 1024,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          fragLoadingMaxRetry: 5,
        });
        hlsRef.current = hls;

        hls.loadSource(finalUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          attemptPlay();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setErrorMsg('خطأ في الاتصال بالشبكة أو البث غير متاح.');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setErrorMsg('خطأ في تشغيل الوسائط، جاري المحاولة...');
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setErrorMsg('تعذر تشغيل هذا البث حالياً.');
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = finalUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(e => console.log('Auto-play prevented:', e));
        });
        video.onerror = () => {
          setIsLoading(false);
          setErrorMsg("تعذر التشغيل (غير مدعوم أو لا يوجد اتصال)");
        };
      }
    }
    
    return () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [channel, refreshCount]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (showEpisodesPanel) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [showEpisodesPanel]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (showEpisodesPanel) return;
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    if (e) e.stopPropagation();
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const skipForward = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
    }
  };

  const skipBackward = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleFullscreen = (e) => {
    if (e) e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cTime = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(cTime);

    // Save progress every 5 seconds
    if (Math.abs(cTime - lastSavedTimeRef.current) > 5) {
      if (user && activeProfile && cTime > 15) {
        // Prepare item to save (ensure it has enough info)
        let itemToSave = channel;
        if (seriesInfo) {
          itemToSave = {
            ...channel,
            series_id: seriesInfo.series_id,
            series_name: seriesInfo.name,
            cover: seriesInfo.cover,
            episode_num: channel.episode_num,
            season: channel.season,
            type: 'series'
          };
        }
        saveContinueWatching(user.id, activeProfile.id, itemToSave, cTime, dur).catch(console.error);
      }
      lastSavedTimeRef.current = cTime;
    }
  };

  if (!channel) return null;

  const isSeries = episodes && episodes.length > 0;
  const currentSeason = channel.season || 1;
  const seasonEpisodes = episodes.filter(ep => Number(ep.season) === Number(currentSeason));

  return (
    <div 
      className="player-fullscreen" 
      ref={containerRef}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={handleOverlayClick}
    >
      <video 
        ref={videoRef} 
        className="video-element"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
      ></video>

      {isSeries && duration > 0 && (duration - currentTime <= 240 || (currentTime / duration) >= 0.90) && episodes.find(ep => 
        (Number(ep.season) === Number(currentSeason) && Number(ep.episode_num) === Number(channel.episode_num) + 1) ||
        (Number(ep.season) === Number(currentSeason) + 1 && Number(ep.episode_num) === 1)
      ) && (
        <button 
          className="next-episode-overlay premium-btn-primary" 
          style={{ position: 'absolute', bottom: '120px', right: '40px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 50, padding: '12px 24px' }}
          onClick={(e) => {
            e.stopPropagation();
            const nextEp = episodes.find(ep => 
              (Number(ep.season) === Number(currentSeason) && Number(ep.episode_num) === Number(channel.episode_num) + 1) ||
              (Number(ep.season) === Number(currentSeason) + 1 && Number(ep.episode_num) === 1)
            );
            if (nextEp) onPlayEpisode(nextEp);
          }}
        >
          <SkipForward size={24} />
          <div style={{ textAlign: 'left' }}>
            <span style={{display: 'block', fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px'}}>Up Next</span>
            <span style={{ fontWeight: 'bold' }}>
              S{episodes.find(ep => 
                (Number(ep.season) === Number(currentSeason) && Number(ep.episode_num) === Number(channel.episode_num) + 1) ||
                (Number(ep.season) === Number(currentSeason) + 1 && Number(ep.episode_num) === 1)
              )?.season} E{episodes.find(ep => 
                (Number(ep.season) === Number(currentSeason) && Number(ep.episode_num) === Number(channel.episode_num) + 1) ||
                (Number(ep.season) === Number(currentSeason) + 1 && Number(ep.episode_num) === 1)
              )?.episode_num}
            </span>
          </div>
        </button>
      )}

      {isLoading && (
        <div className="error-message" style={{background: 'transparent'}}>
          <Loader2 className="spinner" size={64} color="#E50914" />
        </div>
      )}

      {errorMsg && (
        <div className="error-message">
          <AlertCircle size={48} color="#E50914" />
          <h3 style={{marginTop: '16px'}}>عذراً، تعذر التشغيل</h3>
          <p>{errorMsg}</p>
          <button onClick={onBack} style={{marginTop: '24px', background: '#E50914', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px'}}>
            العودة
          </button>
        </div>
      )}

      <div className={`player-overlay ${!showControls && isPlaying && !isLoading && !errorMsg ? 'hidden' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="player-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={32} />
          </button>
          <div className="header-center">
            <h2 className="header-title">{seriesInfo?.name || channel.name}</h2>
            {isSeries && (
              <p className="header-subtitle">Season {channel.season} Episode {channel.episode_num}</p>
            )}
          </div>
        </div>

        <div className="player-bottom">
          {channel.type !== 'live' ? (
            <div className="timeline-container">
              <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                step="1" 
                value={currentTime} 
                onChange={handleSeek}
                className="timeline-slider"
                style={{ backgroundSize: `${(currentTime / (duration || 1)) * 100}% 100%` }}
              />
            </div>
          ) : (
             <div style={{height: '4px'}}></div>
          )}

          <div className="controls-row">
            <div className="left-controls">
              <button className="control-btn" onClick={togglePlay}>
                {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
              </button>
              
              {channel.type !== 'live' && (
                <>
                  <button className="control-btn" onClick={skipBackward}>
                    <RotateCcw size={28} />
                  </button>
                  <button className="control-btn" onClick={skipForward}>
                    <RotateCw size={28} />
                  </button>
                </>
              )}

              <div className="volume-container">
                <button className="control-btn" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
                <div className="volume-slider-wrapper">
                  <input 
                    type="range" 
                    min="0" max="1" step="0.05" 
                    value={isMuted ? 0 : volume} 
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      if (isMuted) setIsMuted(false);
                    }}
                    className="volume-slider" 
                  />
                </div>
              </div>

              {channel.type !== 'live' && (
                <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
              )}
              {channel.type === 'live' && (
                <span className="time-display" style={{color: '#ff3b30'}}>● مباشر</span>
              )}
            </div>

            <div className="right-controls">
              {isSeries && (
                <button className="icon-text-btn" onClick={() => setShowEpisodesPanel(true)}>
                  <Copy size={24} />
                </button>
              )}
              <button className="icon-text-btn">
                <MessageSquare size={24} />
              </button>
              <button className="control-btn" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Side Panel */}
      <div className="episodes-panel-overlay" style={{ pointerEvents: showEpisodesPanel ? 'auto' : 'none' }} onClick={() => setShowEpisodesPanel(false)}>
        <div className={`episodes-panel ${showEpisodesPanel ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="episodes-header">
            <h3>Season {currentSeason} <ChevronDown size={20} /></h3>
            <button className="close-panel-btn" onClick={() => setShowEpisodesPanel(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="episodes-list">
            {seasonEpisodes.map((ep, idx) => {
              const isActive = String(ep.id) === String(channel.id);
              const imgUrl = ep.info?.movie_image || ep.info?.cover || seriesInfo?.cover || 'https://placehold.co/320x180/111/fff?text=No+Image';
              return (
                <div key={idx} className={`episode-item ${isActive ? 'active' : ''}`} onClick={() => {
                  if (onPlayEpisode) onPlayEpisode(ep);
                  setShowEpisodesPanel(false);
                }}>
                  <img src={imgUrl} alt={ep.title} className="ep-thumbnail" onError={(e) => { e.target.src='https://placehold.co/320x180/111/fff?text=No+Image' }} />
                  <div className="ep-info">
                    <div className="ep-title-row">
                      <h4 className="ep-title">Episode {ep.episode_num}: {ep.title}</h4>
                    </div>
                    <p className="ep-desc">{ep.info?.plot || 'No description available for this episode.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
