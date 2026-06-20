import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize, Minimize, ChevronRight, Loader2, AlertCircle, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './Player.css';

export default function Player({ channel, onBack }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  
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

    let finalUrl = channel.url;
    const isLive = channel.type === 'live';
    
    // For Xtream Codes, we prefer .m3u8 for HLS compatibility in video.js
    if (isLive && finalUrl.endsWith('.ts')) {
      finalUrl = finalUrl.replace(/\.ts$/, '.m3u8');
    }

    // Initialize video.js if not initialized yet
    if (!playerRef.current) {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      const player = videojs(videoElement, {
        controls: false,
        autoplay: true,
        preload: 'auto',
        fluid: false,
        html5: {
          vhs: {
            overrideNative: !window.Capacitor, // Use VHS on web, let Capacitor native handle if needed
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false
        }
      }, () => {
        // Player is ready
      });

      player.on('play', () => setIsPlaying(true));
      player.on('pause', () => setIsPlaying(false));
      player.on('playing', () => setIsLoading(false));
      player.on('waiting', () => setIsLoading(true));
      player.on('error', () => {
        setIsLoading(false);
        const error = player.error();
        if (error) {
          console.error('Video.js Error:', error);
          if (error.code === 2) {
            setErrorMsg('خطأ في الاتصال بالشبكة...');
          } else if (error.code === 4) {
            setErrorMsg('تعذر التشغيل (غير مدعوم أو لا يوجد اتصال)');
          } else {
            setErrorMsg('تعذر تشغيل هذا البث حالياً.');
          }
        }
      });
      
      // Attempt to play once ready
      player.on('ready', () => {
        const playPromise = player.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
               setIsPlaying(false);
            });
        }
      });

      playerRef.current = player;
    }

    // Update source
    const player = playerRef.current;
    
    let type = 'application/x-mpegURL'; // default to HLS
    if (!isLive) {
        if (finalUrl.endsWith('.mp4')) type = 'video/mp4';
        else if (finalUrl.endsWith('.mkv')) type = 'video/webm'; // fallback
    }

    player.src({ src: finalUrl, type });
    player.load();
    player.play().catch(e => console.error("Play error:", e));

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [channel, refreshCount]);

  // Clean up player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume(volume);
      playerRef.current.muted(isMuted);
    }
  }, [volume, isMuted]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (!playerRef.current) return;
    if (playerRef.current.paused()) {
      playerRef.current.play();
      setIsPlaying(true);
    } else {
      playerRef.current.pause();
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
      <div data-vjs-player style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <video 
          ref={videoRef} 
          className="video-js vjs-fill video-element"
          playsInline
        ></video>
      </div>

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
