import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize, Minimize, ChevronRight, Loader2, AlertCircle, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import Hls from 'hls.js';
import './Player.css';

export default function Player({ channel, onBack }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  
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
  
  const controlsTimeoutRef = useRef(null);

  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
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
    
    // Minimal fallback: if it strictly ends with .ts, change to .m3u8
    if (finalUrl.endsWith('.ts')) {
      finalUrl = finalUrl.replace(/\.ts$/, '.m3u8');
    }

    const attemptPlay = () => {
      setIsLoading(false);
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
          xhrSetup: (xhr, url) => {}
        });
        hlsRef.current = hls;

        hls.loadSource(finalUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch(e => console.log('Auto-play prevented:', e));
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

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
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

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRefresh = (e) => {
    if (e) e.stopPropagation();
    setRefreshCount(c => c + 1);
  };

  const toggleFullscreen = () => {
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

  if (!channel) return null;

  return (
    <div 
      className="player-fullscreen" 
      ref={containerRef}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={togglePlay}
    >
      <video 
        ref={videoRef} 
        className="video-element"
        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'black' }}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
      ></video>

      {isLoading && (
        <div className="error-message" style={{background: 'rgba(0,0,0,0.5)'}}>
          <Loader2 className="spinner" size={48} color="white" />
        </div>
      )}

      {errorMsg && (
        <div className="error-message">
          <AlertCircle size={48} color="#E50914" />
          <h3>عذراً، تعذر التشغيل</h3>
          <p>{errorMsg}</p>
          <button className="play-main-btn" onClick={onBack} style={{marginTop: '24px', maxWidth: '200px', fontSize: '16px', padding: '12px'}}>
            العودة
          </button>
        </div>
      )}

      <div className={`player-overlay ${!showControls && isPlaying && !isLoading && !errorMsg ? 'hidden' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="player-header">
          <button className="back-btn glass-effect" onClick={onBack} title="العودة" style={{ position: 'relative', top: 0 }}>
            <ChevronRight size={24} />
          </button>
          <div className="channel-title-center glass-effect">
            <h2 style={{ fontSize: '16px', fontWeight: 'bold' }}>{channel.name}</h2>
          </div>
        </div>

        <div className="main-controls" onClick={togglePlay} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           {!isPlaying && !isLoading && !errorMsg && (
             <div className="center-play-btn glass-effect" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Play size={40} fill="white" />
             </div>
           )}
        </div>

        <div className="bottom-bar glass-effect" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(0,0,0,0.7)', width: '100%', boxSizing: 'border-box' }}>
          <button className="control-btn" onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
          </button>

          {channel.type !== 'live' ? (
            <div className="timeline-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }} onClick={e => e.stopPropagation()}>
              <span style={{ color: 'white', fontSize: '12px', minWidth: '40px', textAlign: 'center', userSelect: 'none' }}>{formatTime(currentTime)}</span>
              <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                step="1" 
                value={currentTime} 
                onChange={handleSeek}
                className="timeline-slider"
                style={{ flex: 1, height: '4px', cursor: 'pointer', accentColor: '#E50914' }}
              />
              <span style={{ color: 'white', fontSize: '12px', minWidth: '40px', textAlign: 'center', userSelect: 'none' }}>{formatTime(duration)}</span>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div className="live-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'red', fontSize: '14px', fontWeight: 'bold' }}>
                <div className="live-dot" style={{ width: '8px', height: '8px', background: 'red', borderRadius: '50%' }}></div>
                مباشر
              </div>
            </div>
          )}

          <div className="volume-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
            <button className="control-btn" onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input 
              type="range" 
              min="0" max="1" step="0.05" 
              value={isMuted ? 0 : volume} 
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="volume-slider" 
              style={{ width: '80px', accentColor: 'white', cursor: 'pointer' }}
            />
          </div>
          
          <div className="right-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="control-btn" onClick={handleRefresh} title="تحديث البث" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <RefreshCw size={20} />
            </button>
            <button className="control-btn" onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
