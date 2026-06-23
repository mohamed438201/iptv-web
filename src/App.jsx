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
  const [loadingText, setLoadingText] = useState('جاري الاتصال بالسيرفر...');
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
      window.electronAPI.onCheckingForUpdate(() => setUpdateMessage('جاري البحث عن تحديثات...'));
      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateMessage('أنت تستخدم أحدث نسخة.');
        setTimeout(() => setUpdateMessage(null), 3000);
      });
      window.electronAPI.onUpdateAvailable(() => setUpdateMessage('جاري تحميل تحديث جديد...'));
      window.electronAPI.onDownloadProgress((_, percent) => setUpdateProgress(Math.round(percent)));
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateMessage('اكتمل التحميل. سيتم التثبيت قريباً.');
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

            setUpdateMessage('جاري تحميل تحديث جديد...');
            const newBundle = await CapacitorUpdater.download({
              url: zipAsset.browser_download_url,
              version: latestVersion
            });
            setUpdateMessage('جاري تثبيت التحديث...');
            await CapacitorUpdater.set(newBundle);
          }
        }
      } catch (err) {
        console.log('OTA Error:', err);
        setUpdateMessage('فشل في التحديث، يرجى المحاولة لاحقاً.');
        setTimeout(() => setUpdateMessage(null), 4000);
      }
    }
  };

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.setDiscordActivity) {
      const updateRPC = () => {
        if (currentView === 'player' && selectedItem) {
          let title = String(selectedItem.name || selectedItem.title || 'Video');
          if (title.length > 100) title = title.substring(0, 100) + '...';
          window.electronAPI.setDiscordActivity(`Watching: ${title}`, 'Programmer: Mohamed Sherif');
        } else if (currentView === 'detail' && selectedItem) {
          let title = String(selectedItem.name || selectedItem.title || 'Video');
          if (title.length > 100) title = title.substring(0, 100) + '...';
          window.electronAPI.setDiscordActivity(`Viewing: ${title}`, 'Programmer: Mohamed Sherif');
        } else {
          // Send empty string to clear activity
          window.electronAPI.setDiscordActivity('', '');
        }
      };
      
      // Add a slight delay to prevent Discord rate limits from dropping consecutive quick updates
      const timer = setTimeout(updateRPC, 500);
      return () => clearTimeout(timer);
    }
  }, [currentView, selectedItem]);

  const fetchData = async (action) => {
    const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const query = `player_api.php?username=${SERVER.user}&password=${SERVER.pass}&action=${action}`;

    if (window.electronAPI && window.electronAPI.fetchApi) {
      const fullUrl = `${SERVER.host}/${query}`;
      const res = await window.electronAPI.fetchApi(fullUrl);
      if (!res.ok) throw new Error(`Server Error: ${res.status} ${res.error || ''}`);
      return res.data;
    }

    const useProxy = !isNativeApp || (isNativeApp && isDev && !window.Capacitor);
    const baseUrl = useProxy ? SERVER.proxy : SERVER.host;
    const finalUrl = `${baseUrl}/${query}`;
    
    const response = await fetch(finalUrl);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    return await response.json();
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setLoadingText('جاري تحميل باقات القنوات المباشرة...');
      try {
        const [lCats, lStrs] = await Promise.all([
          fetchData('get_live_categories'),
          fetchData('get_live_streams')
        ]);
        setLiveCategories(lCats);
        setLiveStreams(lStrs);
      } catch (err) { console.error("Live Fetch Error:", err); }

      setLoadingText('جاري تحميل مكتبة الأفلام...');
      try {
        const [vodCats, vodStrs] = await Promise.all([
          fetchData('get_vod_categories'),
          fetchData('get_vod_streams')
        ]);
        setVodCategories(vodCats);
        setVodStreams(vodStrs);
      } catch (err) { console.error("VOD Fetch Error:", err); }

      setLoadingText('جاري تحميل مكتبة المسلسلات...');
      try {
        const [serCats, serStrs] = await Promise.all([
          fetchData('get_series_categories'),
          fetchData('get_series')
        ]);
        setSeriesCategories(serCats);
        setSeriesStreams(serStrs);
      } catch (err) { console.error("Series Fetch Error:", err); }

      setIsLoading(false);
    } catch (err) {
      console.error("Fetch Data Error:", err);
      setError('تعذر الاتصال بالسيرفر أو جلب البيانات. تأكد من اتصالك بالانترنت.');
      setIsLoading(false);
    }
  };

  const generatePlayUrl = (streamId, type = 'live', extension = 'm3u8') => {
    const isElectron = window.electronAPI && window.electronAPI.fetchApi;
    const path = type === 'live' ? 'live' : (type === 'movie' ? 'movie' : 'series');
    const queryPath = `/${path}/${SERVER.user}/${SERVER.pass}/${streamId}.${extension}`;

    if (isElectron) {
      // Use local HTTP proxy to bypass Chromium HSTS/CORS and Cloudflare issues
      const baseUrl = SERVER.host.replace(/^https?:\/\//i, 'http://');
      const targetUrl = `${baseUrl}${queryPath}`;
      return `http://127.0.0.1:12121/${targetUrl}`;
    }

    // Web / Capacitor
    const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const useProxy = !isNativeApp || (isNativeApp && isDev && !window.Capacitor);
    const baseUrl = useProxy ? SERVER.proxy : SERVER.host;
    return `${baseUrl}${queryPath}`;
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
        <h2 style={{ color: '#E50914', marginBottom: '16px' }}>حدث خطأ</h2>
        <p>{error}</p>
        <button onClick={fetchAllData} className="retry-btn" style={{ marginTop: '24px' }}>إعادة المحاولة</button>
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
      {currentView !== 'player' && (
        <aside className="app-sidebar">
          <div className="sidebar-brand" onClick={() => { setCurrentView('home'); setCurrentCategoryId('all'); setSearchQuery(''); }}>
            MY<span>IPTV</span> <span style={{ fontSize: '12px', color: '#888', verticalAlign: 'middle', fontWeight: '500', letterSpacing: '0' }}>v2.0</span>
          </div>
          <nav className="sidebar-nav">
            <button className={`sidebar-nav-item ${currentTab === 'live' && currentView === 'home' ? 'active' : ''}`} onClick={() => { setCurrentTab('live'); setCurrentCategoryId('all'); setCurrentView('home'); }}>
              <MonitorPlay size={22} />
              <span>مباشر</span>
            </button>
            <button className={`sidebar-nav-item ${currentTab === 'vod' && currentView === 'home' ? 'active' : ''}`} onClick={() => { setCurrentTab('vod'); setCurrentCategoryId('all'); setCurrentView('home'); }}>
              <Film size={22} />
              <span>أفلام</span>
            </button>
            <button className={`sidebar-nav-item ${currentTab === 'series' && currentView === 'home' ? 'active' : ''}`} onClick={() => { setCurrentTab('series'); setCurrentCategoryId('all'); setCurrentView('home'); }}>
              <Tv size={22} />
              <span>مسلسلات</span>
            </button>
            <button className={`sidebar-nav-item ${currentTab === 'search' && currentView === 'home' ? 'active' : ''}`} onClick={() => { setCurrentTab('search'); setCurrentCategoryId('all'); setCurrentView('home'); }}>
              <Search size={22} />
              <span>بحث</span>
            </button>
          </nav>
        </aside>
      )}

      <main className="app-main-content">
        {updateMessage && (
          <div className="update-banner" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(229, 9, 20, 0.9)', color: 'white', padding: '12px', textAlign: 'center', zIndex: 9999, fontSize: '13px', fontWeight: 'bold', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              {updateMessage} {updateProgress !== null ? `${updateProgress}%` : ''}
            </div>
            <button onClick={() => setUpdateMessage(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 8px' }}>✕</button>
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
      </main>
    </div>
  );
}
