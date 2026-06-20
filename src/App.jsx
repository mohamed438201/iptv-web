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
      }
    }
  };

  const getApiUrl = (action) => {
    const baseUrl = isNativeApp ? SERVER.host : SERVER.proxy;
    return `${baseUrl}/player_api.php?username=${SERVER.user}&password=${SERVER.pass}&action=${action}`;
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setLoadingText('جاري تحميل باقات القنوات المباشرة...');
      const [liveCatRes, liveStrRes] = await Promise.all([
        fetch(getApiUrl('get_live_categories')),
        fetch(getApiUrl('get_live_streams'))
      ]);
      
      if (!liveCatRes.ok || !liveStrRes.ok) throw new Error('فشل الاتصال بالسيرفر');
      
      const lCats = await liveCatRes.json();
      const lStrs = await liveStrRes.json();
      setLiveCategories(lCats);
      setLiveStreams(lStrs);

      setLoadingText('جاري تحميل مكتبة الأفلام...');
      const [vodCatRes, vodStrRes] = await Promise.all([
        fetch(getApiUrl('get_vod_categories')),
        fetch(getApiUrl('get_vod_streams'))
      ]);
      if (vodCatRes.ok && vodStrRes.ok) {
        setVodCategories(await vodCatRes.json());
        setVodStreams(await vodStrRes.json());
      }

      setLoadingText('جاري تحميل مكتبة المسلسلات...');
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
      setError('تعذر الاتصال بالسيرفر أو جلب البيانات. تأكد من اتصالك بالانترنت.');
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
      {updateMessage && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(229, 9, 20, 0.9)', color: 'white', padding: '12px', textAlign: 'center', zIndex: 9999, fontSize: '13px', fontWeight: 'bold', backdropFilter: 'blur(10px)' }}>
          {updateMessage} {updateProgress !== null ? `${updateProgress}%` : ''}
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
                <span>مباشر</span>
              </button>
              <button className={`nav-item ${currentTab === 'vod' ? 'active' : ''}`} onClick={() => { setCurrentTab('vod'); setCurrentCategoryId('all'); }}>
                <div className="nav-icon-container"><Film size={22} /></div>
                <span>أفلام</span>
              </button>
              <button className={`nav-item ${currentTab === 'series' ? 'active' : ''}`} onClick={() => { setCurrentTab('series'); setCurrentCategoryId('all'); }}>
                <div className="nav-icon-container"><Tv size={22} /></div>
                <span>مسلسلات</span>
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
