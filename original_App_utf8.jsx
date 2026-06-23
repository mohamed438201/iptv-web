import React, { useState, useEffect, useMemo } from 'react';
import Home from './components/Home';
import ChannelDetail from './components/ChannelDetail';
import Player from './components/Player';
import { Home as HomeIcon, Search, MonitorPlay, Film, Tv } from 'lucide-react';

export default function App() {
  // Data States
  const [liveCategories, setLiveCategories] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [vodCategories, setVodCategories] = useState([]);
  const [vodStreams, setVodStreams] = useState([]);
  const [seriesCategories, setSeriesCategories] = useState([]);
  const [seriesStreams, setSeriesStreams] = useState([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('╪¼╪º╪▒┘è ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪º┘ä╪│┘è╪▒┘ü╪▒...');
  const [error, setError] = useState(null);

  // Navigation States
  const [currentView, setCurrentView] = useState('home'); // home, detail, player
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentTab, setCurrentTab] = useState('live'); // live, vod, series, search
  const [currentCategoryId, setCurrentCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // OTA States
  const [updateMessage, setUpdateMessage] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);

  const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
  
  // Only the specified server
  const SERVER = { host: 'http://xc.nv2.xyz:80', user: 'gamila2026', pass: 'gamila2026', proxy: '/nv2' };

  useEffect(() => {
    setupOTAUpdaters();
    fetchAllData();
  }, []);

  const setupOTAUpdaters = async () => {
    if (window.electronAPI) {
      window.electronAPI.onCheckingForUpdate(() => setUpdateMessage('╪¼╪º╪▒┘è ╪º┘ä╪¿╪¡╪½ ╪╣┘å ╪¬╪¡╪»┘è╪½╪º╪¬...'));
      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateMessage('╪ú┘å╪¬ ╪¬╪│╪¬╪«╪»┘à ╪ú╪¡╪»╪½ ┘å╪│╪«╪⌐.');
        setTimeout(() => setUpdateMessage(null), 3000);
      });
      window.electronAPI.onUpdateAvailable(() => setUpdateMessage('╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪¬╪¡╪»┘è╪½ ╪¼╪»┘è╪»...'));
      window.electronAPI.onDownloadProgress((_, percent) => setUpdateProgress(Math.round(percent)));
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateMessage('╪º┘â╪¬┘à┘ä ╪º┘ä╪¬╪¡┘à┘è┘ä. ╪│┘è╪¬┘à ╪º┘ä╪¬╪½╪¿┘è╪¬ ┘é╪▒┘è╪¿╪º┘ï.');
        setTimeout(() => window.electronAPI.restartApp(), 3000);
      });
    }

    if (window.Capacitor && window.Capacitor.getPlatform() === 'android') {
      try {
        const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
        await CapacitorUpdater.notifyAppReady();
        
        const res = await fetch('https://api.github.com/repos/mohamed438201/iptv-web/releases/latest');
        const release = await res.json();
        const zipAsset = release.assets?.find(a => a.name === 'dist.zip');
        
        if (zipAsset) {
          const latestVersion = release.tag_name;
          const currentVersion = await CapacitorUpdater.current();
          
          if (currentVersion.version !== latestVersion) {
            const failKey = `ota_fails_${latestVersion}`;
            const failedAttempts = parseInt(localStorage.getItem(failKey) || '0');
            if (failedAttempts >= 3) {
              console.log('Skipping update loop for', latestVersion);
              return;
            }
            localStorage.setItem(failKey, (failedAttempts + 1).toString());

            setUpdateMessage('╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪¬╪¡╪»┘è╪½ ╪¼╪»┘è╪»...');
            const newBundle = await CapacitorUpdater.download({
              url: zipAsset.browser_download_url,
              version: latestVersion
            });
            setUpdateMessage('╪¼╪º╪▒┘è ╪¬╪½╪¿┘è╪¬ ╪º┘ä╪¬╪¡╪»┘è╪½...');
            await CapacitorUpdater.set(newBundle);
          }
        }
      } catch (err) {
        console.log('OTA Error:', err);
        setUpdateMessage('┘ü╪┤┘ä ┘ü┘è ╪º┘ä╪¬╪¡╪»┘è╪½╪î ┘è╪▒╪¼┘ë ╪º┘ä┘à╪¡╪º┘ê┘ä╪⌐ ┘ä╪º╪¡┘é╪º┘ï.');
        setTimeout(() => setUpdateMessage(null), 4000);
      }
    }
  };

  const getApiUrl = (action) => {
    // If running in development (Vite), always use the proxy to avoid HTTPS upgrade issues
    const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // If Capacitor or production Electron, use host directly
    const useProxy = !isNativeApp || (isNativeApp && isDev && !window.Capacitor);
    const baseUrl = useProxy ? SERVER.proxy : SERVER.host;
    return `${baseUrl}/player_api.php?username=${SERVER.user}&password=${SERVER.pass}&action=${action}`;
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setLoadingText('╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪¿╪º┘é╪º╪¬ ╪º┘ä┘é┘å┘ê╪º╪¬ ╪º┘ä┘à╪¿╪º╪┤╪▒╪⌐...');
      const [liveCatRes, liveStrRes] = await Promise.all([
        fetch(getApiUrl('get_live_categories')),
        fetch(getApiUrl('get_live_streams'))
      ]);
      
      if (!liveCatRes.ok || !liveStrRes.ok) throw new Error('┘ü╪┤┘ä ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪º┘ä╪│┘è╪▒┘ü╪▒');
      
      const lCats = await liveCatRes.json();
      const lStrs = await liveStrRes.json();
      setLiveCategories(lCats);
      setLiveStreams(lStrs);

      setLoadingText('╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ┘à┘â╪¬╪¿╪⌐ ╪º┘ä╪ú┘ü┘ä╪º┘à...');
      const [vodCatRes, vodStrRes] = await Promise.all([
        fetch(getApiUrl('get_vod_categories')),
        fetch(getApiUrl('get_vod_streams'))
      ]);
      if (vodCatRes.ok && vodStrRes.ok) {
        setVodCategories(await vodCatRes.json());
        setVodStreams(await vodStrRes.json());
      }

      setLoadingText('╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ┘à┘â╪¬╪¿╪⌐ ╪º┘ä┘à╪│┘ä╪│┘ä╪º╪¬...');
      const [serCatRes, serStrRes] = await Promise.all([
        fetch(getApiUrl('get_series_categories')),
        fetch(getApiUrl('get_series'))
      ]);
      if (serCatRes.ok && serStrRes.ok) {
        setSeriesCategories(await serCatRes.json());
        setSeriesStreams(await serStrRes.json());
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Fetch Data Error:", err);
      setError('╪¬╪╣╪░╪▒ ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪º┘ä╪│┘è╪▒┘ü╪▒ ╪ú┘ê ╪¼┘ä╪¿ ╪º┘ä╪¿┘è╪º┘å╪º╪¬. ╪¬╪ú┘â╪» ┘à┘å ╪º╪¬╪╡╪º┘ä┘â ╪¿╪º┘ä╪º┘å╪¬╪▒┘å╪¬.');
      setIsLoading(false);
    }
  };

  const generatePlayUrl = (streamId, type = 'live', extension = 'm3u8') => {
    const baseUrl = isNativeApp ? SERVER.host : SERVER.proxy;
    const path = type === 'live' ? 'live' : (type === 'movie' ? 'movie' : 'series');
    return `${baseUrl}/${path}/${SERVER.user}/${SERVER.pass}/${streamId}.${extension}`;
  };

  const handleSelect = (item, type) => {
    if (!item) return;
    
    let playUrl = '';
    let isMovieOrSeries = type === 'vod' || type === 'series';
    
    if (type === 'live') {
      playUrl = generatePlayUrl(item.stream_id, 'live', 'm3u8');
    } else if (type === 'vod') {
      playUrl = generatePlayUrl(item.stream_id, 'movie', item.container_extension || 'mp4');
    } else if (type === 'series') {
      // For series we usually need to fetch episodes, but for simplicity we show detail
      // Let's defer URL generation to the detail view for series
    }

    const enhancedItem = {
      ...item,
      url: playUrl,
      type: type,
      name: item.name,
      logo: item.stream_icon || item.cover || '',
    };

    setSelectedItem(enhancedItem);
    setCurrentView(isMovieOrSeries ? 'detail' : 'player');
  };

  const handlePlay = (item) => {
    if (!item) return;
    setSelectedItem(item);
    setCurrentView('player');
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', direction: 'rtl' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '24px', color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{loadingText}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center', direction: 'rtl' }}>
        <h2 style={{ color: '#E50914', marginBottom: '16px' }}>╪¡╪»╪½ ╪«╪╖╪ú</h2>
        <p>{error}</p>
        <button onClick={fetchAllData} className="retry-btn" style={{ marginTop: '24px' }}>╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä┘à╪¡╪º┘ê┘ä╪⌐</button>
      </div>
    );
  }

  const getCurrentData = () => {
    if (currentTab === 'live') return { categories: liveCategories, streams: liveStreams };
    if (currentTab === 'vod') return { categories: vodCategories, streams: vodStreams };
    if (currentTab === 'series') return { categories: seriesCategories, streams: seriesStreams };
    return { categories: [], streams: [] };
  };

  const { categories, streams } = getCurrentData();

  return (
    <div className="app-container">
      {updateMessage && (
        <div className="update-banner" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(229, 9, 20, 0.9)', color: 'white', padding: '12px', textAlign: 'center', zIndex: 9999, fontSize: '13px', fontWeight: 'bold', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            {updateMessage} {updateProgress !== null ? `${updateProgress}%` : ''}
          </div>
          <button onClick={() => setUpdateMessage(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 8px' }}>Γ£ò</button>
        </div>
      )}
      
      {currentView === 'home' && (
        <Home 
          currentTab={currentTab}
          categories={categories}
          streams={streams}
          currentCategoryId={currentCategoryId}
          onSelectCategory={setCurrentCategoryId}
          onItemSelect={(item) => handleSelect(item, currentTab)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}
      
      {currentView === 'detail' && selectedItem && (
        <ChannelDetail 
          item={selectedItem}
          server={SERVER}
          onBack={() => setCurrentView('home')}
          onPlay={handlePlay}
        />
      )}
      
      {currentView === 'player' && selectedItem && (
        <Player 
          channel={selectedItem} 
          onBack={() => setCurrentView(selectedItem.type === 'live' ? 'home' : 'detail')} 
        />
      )}

      {currentView === 'home' && (
        <div className="bottom-nav-container">
          <div className="bottom-nav-wrapper">
            <div className="bottom-nav-pill">
              <button className={`nav-item ${currentTab === 'live' ? 'active' : ''}`} onClick={() => { setCurrentTab('live'); setCurrentCategoryId('all'); }}>
                <div className="nav-icon-container"><MonitorPlay size={22} /></div>
                <span>┘à╪¿╪º╪┤╪▒</span>
              </button>
              <button className={`nav-item ${currentTab === 'vod' ? 'active' : ''}`} onClick={() => { setCurrentTab('vod'); setCurrentCategoryId('all'); }}>
                <div className="nav-icon-container"><Film size={22} /></div>
                <span>╪ú┘ü┘ä╪º┘à</span>
              </button>
              <button className={`nav-item ${currentTab === 'series' ? 'active' : ''}`} onClick={() => { setCurrentTab('series'); setCurrentCategoryId('all'); }}>
                <div className="nav-icon-container"><Tv size={22} /></div>
                <span>┘à╪│┘ä╪│┘ä╪º╪¬</span>
              </button>
            </div>
            <button className={`nav-fab-search ${currentTab === 'search' ? 'active' : ''}`} onClick={() => setCurrentTab('search')}>
              <Search size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
