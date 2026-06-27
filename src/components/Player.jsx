import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize, Minimize, ArrowLeft, ArrowRight, Loader2, AlertCircle, Volume2, VolumeX, RotateCcw, RotateCw, Copy, MessageSquare, ChevronDown, X, SkipForward, Info } from 'lucide-react';
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
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(channel?.season || 1);
  const [nextCountdown, setNextCountdown] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [wasPlayingBeforeInfo, setWasPlayingBeforeInfo] = useState(false);

  useEffect(() => {
    if (channel?.season) {
      setSelectedSeason(channel.season);
    }
  }, [channel]);

  const isSeries = channel?.type === 'series';
  const availableSeasons = [...new Set(episodes.map(e => Number(e.season)))].sort((a, b) => a - b);
  const seasonEpisodes = episodes.filter(e => String(e.season) === String(selectedSeason));

  const playingSeason = channel?.season || 1;

  const controlsTimeoutRef = useRef(null);

  const handleInteraction = () => {
    if (showEpisodesPanel || showInfoModal) return; // Keep controls visible if panel or modal is open
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showEpisodesPanel && !showInfoModal) setShowControls(false);
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
    const isOfflineMp4 = channel.isOffline && !finalUrl.includes('.m3u8');
    const isMp4OrMkv = finalUrl.includes('.mp4') || finalUrl.includes('.mkv') || finalUrl.includes('.avi') || isOfflineMp4;
    
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
        setErrorMsg("Playback failed (Not supported or no connection)");
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
          xhrSetup: function(xhr, url) {
            const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            // If using the local proxy, route ALL segments through it to keep TLS fingerprint consistent!
            if (isDev && url.startsWith('http') && !url.startsWith('http://127.0.0.1:12121')) {
              xhr.open('GET', 'http://127.0.0.1:12121/' + url, true);
            }
          }
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
                setErrorMsg('Network error or stream is unavailable.');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setErrorMsg('خطأ في تشغيل الوسائط، جاري المحاولة...');
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setErrorMsg('Unable to play this stream right now.');
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
          setErrorMsg("Playback failed (Not supported or no connection)");
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

  const handleEnded = () => {
    setIsPlaying(false);
    if (isSeries) {
      const nextEp = episodes.find(ep => 
        (Number(ep.season) === Number(playingSeason) && Number(ep.episode_num) === Number(channel.episode_num) + 1) ||
        (Number(ep.season) === Number(playingSeason) + 1 && Number(ep.episode_num) === 1)
      );
      if (nextEp) {
        setNextCountdown(5);
      }
    }
  };

  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown === 0) {
      const nextEp = episodes.find(ep => 
        (Number(ep.season) === Number(playingSeason) && Number(ep.episode_num) === Number(channel.episode_num) + 1) ||
        (Number(ep.season) === Number(playingSeason) + 1 && Number(ep.episode_num) === 1)
      );
      if (nextEp) {
        setNextCountdown(null);
        onPlayEpisode(nextEp);
      }
      return;
    }
    const t = setTimeout(() => setNextCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [nextCountdown, episodes, playingSeason, channel, onPlayEpisode]);

  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      if (volume <= 1) {
        videoRef.current.volume = volume;
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = 1;
        }
      } else {
        videoRef.current.volume = 1; // Max native volume
        if (!audioCtxRef.current) {
          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            const source = audioCtxRef.current.createMediaElementSource(videoRef.current);
            gainNodeRef.current = audioCtxRef.current.createGain();
            source.connect(gainNodeRef.current);
            gainNodeRef.current.connect(audioCtxRef.current.destination);
          } catch (e) {
            console.error("Audio API error:", e);
          }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = volume; // e.g., 2 = 200%, 3 = 300%
        }
      }
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (showEpisodesPanel || showInfoModal) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [showEpisodesPanel, showInfoModal]);

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

  const formatDurationToMinutes = (durationVal) => {
    if (!durationVal) return '45m';
    
    if (typeof durationVal === 'string' && durationVal.includes(':')) {
      const parts = durationVal.split(':');
      if (parts.length === 3) {
        const hrs = parseInt(parts[0], 10) || 0;
        const mins = parseInt(parts[1], 10) || 0;
        return `${hrs * 60 + mins}m`;
      } else if (parts.length === 2) {
        const mins = parseInt(parts[0], 10) || 0;
        return `${mins}m`;
      }
    }
    
    const num = parseFloat(durationVal);
    if (isNaN(num)) {
      return durationVal;
    }
    
    if (num > 150) {
      return `${Math.round(num / 60)}m`;
    }
    
    return `${Math.round(num)}m`;
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;

      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'arrowright':
          e.preventDefault();
          skipForward();
          break;
        case 'arrowleft':
          e.preventDefault();
          skipBackward();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => Math.min(3, prev + 0.1));
          if (isMuted) setIsMuted(false);
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  const getEpisodeDisplayTitle = () => {
    if (!channel) return '';
    if (!isSeries) return channel.name || '';

    const sName = seriesInfo?.name || channel.series_name || '';
    const sNum = channel.season || selectedSeason || 1;
    const epNum = channel.episode_num || 1;
    const pad = (num) => String(num).padStart(2, '0');
    const seLabel = `S${pad(sNum)}E${pad(epNum)}`;
    
    // Base display: "Series Name - S01E02"
    let baseName = sName;
    if (!baseName && channel.name) {
      // Clean to get series name
      let cleanedName = channel.name;
      cleanedName = cleanedName.replace(/s\d+e\d+/gi, '');
      cleanedName = cleanedName.replace(/e\d+/gi, '');
      cleanedName = cleanedName.replace(/s\d+/gi, '');
      baseName = cleanedName.replace(/^[\s\-_:|]+|[\s\-_:|]+$/g, '').trim();
    }

    if (!baseName) {
      baseName = 'Series';
    }

    let display = `${baseName} - ${seLabel}`;
    
    let epTitle = channel.title || '';
    if (epTitle) {
      let cleanTitle = epTitle;
      
      // Remove series name (case-insensitive)
      if (baseName) {
        const regexName = new RegExp(baseName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        cleanTitle = cleanTitle.replace(regexName, '');
      }
      
      // Remove SxxExx patterns
      cleanTitle = cleanTitle.replace(/s\d+e\d+/gi, '');
      cleanTitle = cleanTitle.replace(/e\d+/gi, '');
      cleanTitle = cleanTitle.replace(/s\d+/gi, '');
      cleanTitle = cleanTitle.replace(/episode\s*\d+/gi, '');
      cleanTitle = cleanTitle.replace(/season\s*\d+/gi, '');
      
      cleanTitle = cleanTitle.replace(/^[\s\-_:|]+|[\s\-_:|]+$/g, '').trim();
      
      if (cleanTitle && cleanTitle.length > 1 && isNaN(cleanTitle)) {
        display += ` - ${cleanTitle}`;
      }
    }
    
    return display;
  };

  const handleOpenInfo = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const playing = !videoRef.current.paused;
      setWasPlayingBeforeInfo(playing);
      if (playing) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
    setShowInfoModal(true);
  };

  const handleCloseInfo = (e) => {
    if (e) e.stopPropagation();
    setShowInfoModal(false);
    if (wasPlayingBeforeInfo && videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  };

  if (!channel) return null;


  return (
    <div 
      className="player-fullscreen" 
      ref={containerRef}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <video 
        ref={videoRef} 
        className="video-element"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={handleEnded}
      ></video>

      {/* Invisible layer to capture clicks for play/pause like Netflix */}
      {!isLoading && !errorMsg && (
        <div className="click-layer" onClick={(e) => {
          e.stopPropagation();
          if (showEpisodesPanel) {
            setShowEpisodesPanel(false);
          } else {
            togglePlay();
          }
        }}></div>
      )}

      {/* Auto-Play Next Countdown Overlay */}
      {nextCountdown !== null && (
        <div className="next-episode-overlay" style={{ zIndex: 60 }}>
          <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '24px' }}>Playing Next Episode in...</h2>
          <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#E50914', marginBottom: '32px' }}>{nextCountdown}</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setNextCountdown(0); }}
              style={{ background: '#E50914', color: 'white', padding: '12px 32px', borderRadius: '4px', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Play Now
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setNextCountdown(null); onBack(); }}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '12px 32px', borderRadius: '4px', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="error-message" style={{background: 'transparent', zIndex: 100}}>
          <Loader2 className="spinner" size={64} color="#E50914" />
        </div>
      )}

      {errorMsg && (
        <div className="error-message">
          <AlertCircle size={48} color="#E50914" />
          <h3 style={{marginTop: '16px'}}>Oops! Playback Failed</h3>
          <p>{errorMsg}</p>
          <button onClick={onBack} style={{marginTop: '24px', background: '#E50914', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px'}}>
            Go Back
          </button>
        </div>
      )}

      {/* Netflix Overlay */}
      <div className={`player-overlay ${!showControls && isPlaying && !isLoading && !errorMsg ? 'hidden' : ''}`} style={{zIndex: 20}}>
        
        {/* Header */}
        <div className="player-header">
          <button className="back-btn" onClick={(e) => { e.stopPropagation(); onBack(); }}>
            <ArrowLeft size={38} />
          </button>
          <button className="info-btn" onClick={handleOpenInfo} title="Info">
            <Info size={30} />
          </button>
        </div>

        {/* Bottom Bar */}
        <div className="player-bottom" onClick={(e) => e.stopPropagation()}>
          {channel.type !== 'live' ? (
            <div className="timeline-wrapper">
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
              <span className="time-display">{formatTime(duration - currentTime)}</span>
            </div>
          ) : (
             <div style={{height: '4px'}}></div>
          )}

          <div className="controls-row">
            <div className="left-controls">
              <button className="control-btn" onClick={togglePlay}>
                {isPlaying ? <Pause size={38} fill="white" /> : <Play size={38} fill="white" />}
              </button>
              
              {channel.type !== 'live' && (
                <>
                  <button className="control-btn skip-btn" onClick={skipBackward}>
                    <RotateCcw size={32} />
                    <span className="skip-text">10</span>
                  </button>
                  <button className="control-btn skip-btn" onClick={skipForward}>
                    <RotateCw size={32} />
                    <span className="skip-text">10</span>
                  </button>
                </>
              )}

              <div className="volume-container">
                <button className="control-btn" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted || volume === 0 ? <VolumeX size={30} /> : <Volume2 size={30} />}
                </button>
                <div className="volume-slider-wrapper">
                  <input 
                    type="range" 
                    min="0" max="3" step="0.05" 
                    value={isMuted ? 0 : volume} 
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      if (isMuted) setIsMuted(false);
                    }}
                    className="volume-slider" 
                  />
                </div>
              </div>
            </div>

            <div className="center-title-container">
              <span className="bottom-title">{getEpisodeDisplayTitle()}</span>
            </div>

            <div className="right-controls">
              {isSeries && episodes.find(ep => 
                (Number(ep.season) === Number(playingSeason) && Number(ep.episode_num) === Number(channel.episode_num) + 1) ||
                (Number(ep.season) === Number(playingSeason) + 1 && Number(ep.episode_num) === 1)
              ) && (
                <button 
                  className="control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextEp = episodes.find(ep => 
                      (Number(ep.season) === Number(playingSeason) && Number(ep.episode_num) === Number(channel.episode_num) + 1) ||
                      (Number(ep.season) === Number(playingSeason) + 1 && Number(ep.episode_num) === 1)
                    );
                    if (nextEp) onPlayEpisode(nextEp);
                  }}
                  title="Next Episode"
                >
                  <SkipForward size={30} />
                </button>
              )}

              {isSeries && (
                <button className="control-btn" onClick={(e) => { e.stopPropagation(); setShowEpisodesPanel(true); }} title="Episodes">
                  <Copy size={30} />
                </button>
              )}
              <button className="control-btn" title="Subtitles">
                <MessageSquare size={30} />
              </button>
              <button className="control-btn" onClick={toggleFullscreen} title="Fullscreen">
                {isFullscreen ? <Minimize size={30} /> : <Maximize size={30} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Side Panel (Netflix style right slide-in) */}
      <div className={`episodes-panel-overlay ${showEpisodesPanel ? 'open' : ''}`} onClick={() => setShowEpisodesPanel(false)}>
        <div className={`episodes-panel ${showEpisodesPanel ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="episodes-header" style={{ position: 'relative' }}>
            <h3 
              onClick={() => setShowSeasonDropdown(!showSeasonDropdown)} 
            >
              Season {selectedSeason} <ChevronDown size={24} />
            </h3>
            
            {showSeasonDropdown && (
              <div className="custom-season-dropdown" style={{ 
                position: 'absolute', 
                top: '100%', 
                left: '32px', 
                background: '#141414', 
                border: '1px solid #333', 
                borderRadius: '4px', 
                zIndex: 100, 
                minWidth: '120px', 
                marginTop: '8px', 
                maxHeight: '200px', 
                overflowY: 'auto',
                boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
              }}>
                {availableSeasons.map(s => (
                  <div 
                    key={s} 
                    onClick={(e) => { 
                      e.stopPropagation();
                      setSelectedSeason(s); 
                      setShowSeasonDropdown(false); 
                    }}
                    style={{ 
                      padding: '12px 16px', 
                      cursor: 'pointer', 
                      background: Number(selectedSeason) === Number(s) ? 'rgba(255,255,255,0.1)' : 'transparent', 
                      color: Number(selectedSeason) === Number(s) ? 'white' : '#aaa', 
                      fontSize: '16px', 
                      borderBottom: '1px solid #222',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { 
                      if (Number(selectedSeason) !== Number(s)) {
                        e.currentTarget.style.color = '#aaa'; 
                        e.currentTarget.style.background = 'transparent';
                      } else {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }
                    }}
                  >
                    Season {s}
                  </div>
                ))}
              </div>
            )}
            
            <button className="close-panel-btn" onClick={() => setShowEpisodesPanel(false)}>
              <X size={32} />
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
                  <div className="ep-number">{ep.episode_num}</div>
                  <img src={imgUrl} alt={ep.title} className="ep-thumbnail" onError={(e) => { e.target.src='https://placehold.co/320x180/111/fff?text=No+Image' }} />
                  <div className="ep-info">
                    <div className="ep-title-row">
                      <h4 className="ep-title">{ep.title || `Episode ${ep.episode_num}`}</h4>
                      <span className="ep-duration">{formatDurationToMinutes(ep.info?.duration)}</span>
                    </div>
                    <p className="ep-desc">{ep.info?.plot || 'No description available for this episode.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info Modal Popup */}
      <div className={`info-modal-overlay ${showInfoModal ? 'open' : ''}`} onClick={handleCloseInfo}>
        <div className="info-modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="info-modal-close" onClick={handleCloseInfo}>
            <X size={28} />
          </button>
          
          <div className="info-modal-layout">
            {(() => {
              const imgUrl = isSeries
                ? (channel.info?.movie_image || channel.info?.cover || seriesInfo?.cover || channel.cover || channel.stream_icon)
                : (channel.cover || channel.stream_icon || channel.info?.movie_image);
              return imgUrl ? (
                <div className="info-modal-media">
                  <img 
                    src={imgUrl} 
                    alt="Cover" 
                    className="info-modal-cover" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              ) : null;
            })()}
            
            <div className="info-modal-info">
              <h2 className="info-modal-title">
                {isSeries ? (seriesInfo?.name || channel.series_name || channel.name) : channel.name}
              </h2>
              {isSeries && (
                <div className="info-modal-subtitle">
                  S{String(channel.season || selectedSeason || 1).padStart(2, '0')}E{String(channel.episode_num || 1).padStart(2, '0')}
                  {channel.title && !channel.title.toLowerCase().includes((seriesInfo?.name || '').toLowerCase()) && ` - ${channel.title}`}
                </div>
              )}
              
              <div className="info-modal-meta">
                {channel.info?.duration && (
                  <span className="info-modal-meta-item">Duration: {formatDurationToMinutes(channel.info.duration)}</span>
                )}
                {(channel.info?.release_date || seriesInfo?.releaseDate || channel.release_date) && (
                  <span className="info-modal-meta-item">Released: {channel.info?.release_date || seriesInfo?.releaseDate || channel.release_date}</span>
                )}
                {(channel.info?.rating || seriesInfo?.rating || channel.rating) && (
                  <span className="info-modal-meta-item">⭐ {channel.info?.rating || seriesInfo?.rating || channel.rating}</span>
                )}
              </div>
              
              <div className="info-modal-plot">
                {channel.info?.plot || channel.plot || channel.description || 'معلومات غير متوفرة'}
              </div>
              
              <div className="info-modal-details-list">
                {(seriesInfo?.genre || channel.genre || channel.info?.genre) && (
                  <div className="info-modal-detail-row">
                    <span className="info-label">Genre:</span>
                    <span className="info-value">{seriesInfo?.genre || channel.genre || channel.info?.genre}</span>
                  </div>
                )}
                {(seriesInfo?.cast || channel.cast || channel.info?.cast) && (
                  <div className="info-modal-detail-row">
                    <span className="info-label">Cast:</span>
                    <span className="info-value">{seriesInfo?.cast || channel.cast || channel.info?.cast}</span>
                  </div>
                )}
                {(seriesInfo?.director || channel.director || channel.info?.director) && (
                  <div className="info-modal-detail-row">
                    <span className="info-label">Director:</span>
                    <span className="info-value">{seriesInfo?.director || channel.director || channel.info?.director}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
