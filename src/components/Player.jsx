import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize, Minimize, ChevronRight, Loader2, AlertCircle, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import Hls from 'hls.js';
import './Player.css';

export default function Player({ channel, onBack }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  
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

    const isLive = channel.type === 'live';
    const isNativeApp = window.Capacitor !== undefined; // Capacitor Android
    
    // Fallback TS to M3U8 for better HLS support
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

    if (!isLive) {
      // VOD (MP4, MKV)
      video.src = finalUrl;
      video.onloadedmetadata = attemptPlay;
      video.onerror = () => {
        setIsLoading(false);
        setErrorMsg("تعذر التشغيل (غير مدعوم أو لا يوجد اتصال)");
      };
    } else {
      // LIVE (M3U8)
      if (Hls.isSupported() && !isNativeApp) {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          enableWorker: true
        });
        hlsRef.current = hls;

        hls.loadSource(finalUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          attemptPlay();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setErrorMsg('خطأ في الاتصال بالشبكة...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setErrorMsg('تعذر تشغيل هذا البث حالياً.');
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl') || isNativeApp) {
        // Native HLS fallback (Safari, iOS, Capacitor Android)
        video.src = finalUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          attemptPlay();
        });
        video.onerror = () => {
          setIsLoading(false);
          setErrorMsg("فشل التشغيل المباشر");
        };
      }
    }
    
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
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
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
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

        <div className="bottom-bar glass-effect" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.7)' }}>
          <div className="left-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="control-btn" onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
            </button>
            <div className="volume-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="control-btn" onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
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
              />
            </div>
            {channel.type === 'live' && (
              <div className="live-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'red', fontSize: '14px', fontWeight: 'bold' }}>
                <div className="live-dot" style={{ width: '8px', height: '8px', background: 'red', borderRadius: '50%' }}></div>
                مباشر
              </div>
            )}
          </div>
          
          <div className="right-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="control-btn" onClick={handleRefresh} title="تحديث البث" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <RefreshCw size={20} />
            </button>
            <button className="control-btn" onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
