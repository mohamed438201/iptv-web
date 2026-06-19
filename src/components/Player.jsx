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
    }, 3000);
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
        setErrorMsg("تعذر التشغيل");
      };
    } else {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          enableWorker: true,
          lowLatencyMode: false,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 20000,
          levelLoadingTimeOut: 20000,
          xhrSetup: function(xhr, url) {
            let requestUrl = url;
            const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
            if (!isNativeApp && requestUrl.includes('ugeen.live')) {
              requestUrl = requestUrl.replace(/^https?:\/\/ugeen\.live(:\d+)?/, '/live');
            }
            xhr.open('GET', requestUrl, true);
          }
        });
        
        hlsRef.current = hls;
        hls.loadSource(finalUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, attemptPlay);
        
        hls.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setIsLoading(false);
                hls.destroy();
                setErrorMsg("خطأ في الاتصال بالبث.");
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setIsLoading(false);
                hls.destroy();
                setErrorMsg("تعذر التشغيل.");
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = finalUrl;
        video.addEventListener('loadedmetadata', attemptPlay);
        video.onerror = () => {
          setIsLoading(false);
          setErrorMsg("تعذر التشغيل");
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
        crossOrigin="anonymous" 
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      ></video>

      {/* Loading State */}
      {isLoading && (
        <div className="error-message" style={{background: 'rgba(0,0,0,0.5)'}}>
          <Loader2 className="spinner" size={48} color="white" />
        </div>
      )}

      {/* Error State */}
      {errorMsg && (
        <div className="error-message">
          <AlertCircle size={48} color="#E50914" />
          <h3>عذراً، تعذر التشغيل</h3>
          <p>يبدو أن هناك مشكلة في هذا البث. يرجى المحاولة لاحقاً.</p>
          <button className="play-main-btn" onClick={onBack} style={{marginTop: '24px', maxWidth: '200px'}}>
            العودة
          </button>
        </div>
      )}

      {/* Overlay Controls */}
      <div className={`player-overlay ${!showControls && isPlaying && !isLoading && !errorMsg ? 'hidden' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="player-header">
          <button className="back-btn glass-effect" onClick={onBack} title="العودة">
            <ChevronRight size={24} />
          </button>
          <div className="channel-title-center glass-effect">
            <h2>{channel.name}</h2>
          </div>
        </div>

        <div className="main-controls" onClick={togglePlay}>
           {!isPlaying && !isLoading && !errorMsg && (
             <div className="center-play-btn glass-effect">
               <Play size={48} fill="white" />
             </div>
           )}
        </div>

        <div className="bottom-bar glass-effect">
          <div className="left-controls">
            <button className="control-btn play-pause-small" onClick={togglePlay}>
              {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
            </button>
            <div className="volume-container">
              <button className="control-btn" onClick={() => setIsMuted(!isMuted)}>
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
            <div className="live-indicator">
              <div className="live-dot"></div>
              مباشر
            </div>
          </div>
          
          <div className="right-controls">
            <button className="control-btn" onClick={handleRefresh} title="تحديث البث">
              <RefreshCw size={20} />
            </button>
            <button className="control-btn" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
