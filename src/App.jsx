import React, { useState, useEffect, useMemo } from 'react';
import Home from './components/Home';
import ChannelDetail from './components/ChannelDetail';
import Player from './components/Player';
import Navbar from './components/Navbar';
import AdvancedSearch from './components/AdvancedSearch';
import Account from './components/Account';
import Login from './components/Login';
import Register from './components/Register';
import Plans from './components/Plans';
import ProfileSelection from './components/ProfileSelection';
import AdminDashboard from './components/AdminDashboard';
import { useAuth } from './contexts/AuthContext';
import { Home as HomeIcon, Search, MonitorPlay, Film, Tv } from 'lucide-react';

export default function App() {
  const { user, activeProfile, logout, refreshUser } = useAuth();
  const [authView, setAuthView] = useState('login');

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
  const [playingItem, setPlayingItem] = useState(null);
  const [currentTab, setCurrentTab] = useState('live'); // live, vod, series, search
  const [currentCategoryId, setCurrentCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [playingEpisodes, setPlayingEpisodes] = useState([]);
  const [playingSeriesInfo, setPlayingSeriesInfo] = useState(null);

  // OTA States
  const [updateMessage, setUpdateMessage] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);

  const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
  
  // Only the specified server
  const SERVER = { host: 'http://xc.nv2.xyz:80', user: 'gamila2026', pass: 'gamila2026', proxy: '/nv2' };

  const fetchedPlanRef = React.useRef(null);

  useEffect(() => {
    setupOTAUpdaters();
  }, []);

  useEffect(() => {
    if (user && user.paymentStatus === 'active') {
      if (fetchedPlanRef.current !== user.planId) {
        fetchedPlanRef.current = user.planId;
        fetchAllData(user.planId);
      }
    }
  }, [user?.id, user?.planId, user?.paymentStatus]);

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
        if (currentView === 'player' && playingItem) {
          let title = String(playingItem.name || playingItem.title || 'Video');
          if (title.length > 100) title = title.substring(0, 100) + '...';
          window.electronAPI.setDiscordActivity(`Watching: ${title}`, 'Programmer: Mohamed Sherif');
        } else if (currentView === 'detail' && selectedItem) {
          let title = String(selectedItem.name || selectedItem.title || 'Video');
          if (title.length > 100) title = title.substring(0, 100) + '...';
          window.electronAPI.setDiscordActivity(`Viewing: ${title}`, 'Programmer: Mohamed Sherif');
        } else {
          window.electronAPI.setDiscordActivity('', '');
        }
      };
      const timer = setTimeout(updateRPC, 500);
      return () => clearTimeout(timer);
    }
  }, [currentView, selectedItem, playingItem]);

  const fetchData = async (action, params = {}) => {
    const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let query = `player_api.php?username=${SERVER.user}&password=${SERVER.pass}&action=${action}`;
    
    for (const key in params) {
      query += `&${key}=${params[key]}`;
    }

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

  const fetchAllData = async (planId) => {
    setIsLoading(true);
    setError(null);
    try {
      if (planId !== 'basic') {
        setLoadingText('جاري تحميل باقات القنوات المباشرة...');
        try {
          const [lCats, lStrs] = await Promise.all([
            fetchData('get_live_categories'),
            fetchData('get_live_streams')
          ]);
          setLiveCategories(lCats);
          setLiveStreams(lStrs);
        } catch (err) { console.error("Live Fetch Error:", err); }
      } else {
        setLiveCategories([]);
        setLiveStreams([]);
      }

      if (planId !== 'sports') {
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
      } else {
        setVodCategories([]);
        setVodStreams([]);
        setSeriesCategories([]);
        setSeriesStreams([]);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Fetch Data Error:", err);
      setError('تعذر الاتصال بالسيرفر أو جلب البيانات. تأكد من اتصالك بالانترنت.');
      setIsLoading(false);
    }
  };

  const generatePlayUrl = (streamId, type = 'live', extension = 'm3u8') => {
    const path = type === 'live' ? 'live' : (type === 'movie' ? 'movie' : 'series');
    const queryPath = `/${path}/${SERVER.user}/${SERVER.pass}/${streamId}.${extension}`;

    const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
    const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Always use proxy in dev to avoid CORS and HTTPS upgrade issues
    const useProxy = isDev;
    
    const baseUrl = useProxy ? SERVER.proxy : SERVER.host;
    return `${baseUrl}${queryPath}`;
  };

  const handleSelect = async (item, type) => {
    if (!item) return;
    setIsSearchOpen(false); // Close search overlay if open
    
    // Check if it's a "Continue Watching" item
    if (item.progress !== undefined) {
      let playUrl = '';
      if (item.type === 'series') {
        playUrl = generatePlayUrl(item.id || item.stream_id, 'series', item.container_extension || 'mp4');
        const enhancedEp = { ...item, url: playUrl };
        
        // Fetch series info to get episodes for the "Next Episode" button
        let targetSeriesId = item.series_id;
        
        if (!targetSeriesId) {
          // Attempt to recover series_id from seriesStreams by matching name
          const matchName = item.series_name || item.name;
          const recoveredSeries = seriesStreams.find(s => s.name === matchName || s.title === matchName);
          if (recoveredSeries && recoveredSeries.series_id) {
            targetSeriesId = recoveredSeries.series_id;
            item.series_id = targetSeriesId; // mutate item so it works downstream
          } else {
            handlePlay(enhancedEp, [], { name: item.series_name, cover: item.cover || item.logo });
            return;
          }
        }

        try {
          setIsLoading(true);
          setLoadingText('جاري تحميل بيانات المسلسل...');
          const seriesData = await fetchData('get_series_info', { series_id: targetSeriesId });
          setIsLoading(false);
          const eps = seriesData?.episodes ? Object.values(seriesData.episodes).flat() : [];
          handlePlay(enhancedEp, eps, {
            ...(seriesData?.info || {}),
            series_id: targetSeriesId,
            name: item.series_name || (seriesData?.info && seriesData.info.name),
            cover: item.cover || item.logo || (seriesData?.info && seriesData.info.cover)
          });
        } catch (e) {
          setIsLoading(false);
          handlePlay(enhancedEp, [], { series_id: item.series_id, name: item.series_name, cover: item.cover || item.logo });
        }
        return;
      } else {
        playUrl = generatePlayUrl(item.stream_id, 'movie', item.container_extension || 'mp4');
        const enhancedItem = { ...item, url: playUrl, type: type, name: item.name, logo: item.stream_icon || item.cover || '' };
        setPlayingItem(enhancedItem);
        setCurrentView('player');
        return;
      }
    }

    let playUrl = '';
    let isMovieOrSeries = type === 'vod' || type === 'series';
    
    if (type === 'live') {
      playUrl = generatePlayUrl(item.stream_id, 'live', 'm3u8');
    } else if (type === 'vod') {
      playUrl = generatePlayUrl(item.stream_id, 'movie', item.container_extension || 'mp4');
    }

    const enhancedItem = {
      ...item,
      url: playUrl,
      type: type,
      name: item.name,
      logo: item.stream_icon || item.cover || '',
    };

    setSelectedItem(enhancedItem);
    if (!isMovieOrSeries) {
      setPlayingItem(enhancedItem);
    }
    setCurrentView(isMovieOrSeries ? 'detail' : 'player');
  };

  const handlePlay = (item, episodes = [], seriesInfo = null) => {
    if (!item) return;
    setPlayingEpisodes(episodes);
    setPlayingSeriesInfo(seriesInfo);
    setPlayingItem(item);
    setCurrentView('player');
  };

  const handlePlayEpisode = (ep) => {
    if (!ep) return;
    const playUrl = generatePlayUrl(ep.id, 'series', ep.container_extension || 'mp4');
    const enhancedEp = {
      ...ep,
      url: playUrl,
      type: 'series',
      name: ep.title,
      logo: ep.info?.movie_image || ep.info?.cover || ''
    };
    setPlayingItem(enhancedEp);
  };

  const getDaysLeft = (dateString) => {
    if (!dateString) return null;
    const end = new Date(dateString);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (!user) {
    if (authView === 'login') return <Login onNavigate={setAuthView} />;
    return <Register onNavigate={setAuthView} />;
  }

  if (user.email === 'admin@iptv.com') {
    return <AdminDashboard />;
  }

  if (user.paymentStatus === 'banned') {
    return (
      <div className="premium-auth-wrapper">
        <div className="premium-auth-bg-animated"></div>
        <div className="premium-auth-card" style={{ textAlign: 'center', maxWidth: '480px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
            </div>
          </div>
          <h1 style={{ color: '#fff', fontSize: '28px', marginBottom: '16px', fontWeight: '800' }}>Account Suspended</h1>
          <p style={{ color: '#a0a0b0', lineHeight: '1.6', fontSize: '16px', margin: '0' }}>
            Your account has been <strong style={{ color: '#ef4444' }}>banned</strong> for violating our terms of service. 
            If you believe this is a mistake, please contact support.
          </p>
          <div style={{ marginTop: '32px' }}>
            <button className="text-btn" onClick={() => logout()} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysLeft(user.subscriptionEndDate);
  const isExpired = user.paymentStatus === 'active' && daysLeft === 0;

  if (!user.planId || isExpired || currentView === 'renew') {
    return <Plans onCancel={currentView === 'renew' ? () => setCurrentView('account') : null} />;
  }

  if (user.paymentStatus === 'pending') {
    return (
      <div className="premium-auth-wrapper">
        <div className="premium-auth-bg-animated"></div>
        <div className="premium-auth-card" style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(229, 9, 20, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #E50914', animation: 'spin 10s linear infinite' }}>
              <div style={{ position: 'absolute', animation: 'spin 10s linear infinite reverse' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E50914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>
          </div>
          <h1 style={{ color: '#fff', fontSize: '28px', marginBottom: '16px', fontWeight: '800' }}>Pending Approval</h1>
          <p style={{ color: '#a0a0b0', lineHeight: '1.6', fontSize: '16px', margin: '0' }}>
            We have received your payment receipt. Your subscription is currently <strong style={{ color: '#E50914' }}>pending approval</strong> by the administrator. 
            Please wait while we verify your transfer.
          </p>
          <div style={{ marginTop: '32px' }}>
            <button className="text-btn" onClick={() => logout()} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              Sign Out
            </button>
          </div>
        </div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!activeProfile) {
    return <ProfileSelection onManageProfiles={() => {
      if (user.profiles && user.profiles.length > 0) {
        selectProfile(user.profiles[0].id);
        setCurrentView('account');
      }
    }} />;
  }

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

  return (
    <div className="app-container">
      {currentView !== 'player' && (
        <Navbar 
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            if (tab === 'home') refreshUser();
            setCurrentTab(tab);
            setCurrentCategoryId('all');
            setCurrentView('home');
          }}
          onSearchClick={() => setIsSearchOpen(true)}
          onProfileClick={() => setCurrentView('account')}
        />
      )}

      {isSearchOpen && (
        <AdvancedSearch 
          liveStreams={liveStreams}
          vodStreams={vodStreams}
          seriesStreams={seriesStreams}
          onClose={() => setIsSearchOpen(false)}
          onItemSelect={handleSelect}
        />
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
            setCurrentTab={setCurrentTab}
            categories={currentTab === 'live' ? liveCategories : (currentTab === 'vod' ? vodCategories : seriesCategories)}
            streams={currentTab === 'live' ? liveStreams : (currentTab === 'vod' ? vodStreams : seriesStreams)}
            liveCategories={liveCategories}
            liveStreams={liveStreams}
            vodCategories={vodCategories}
            vodStreams={vodStreams}
            seriesCategories={seriesCategories}
            seriesStreams={seriesStreams}
            currentCategoryId={currentCategoryId}
            onSelectCategory={setCurrentCategoryId}
            onItemSelect={(item, type) => handleSelect(item, type || currentTab)}
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
        
        {currentView === 'player' && playingItem && (
          <Player 
            channel={playingItem} 
            episodes={playingEpisodes}
            seriesInfo={playingSeriesInfo}
            onPlayEpisode={handlePlayEpisode}
            onBack={() => {
              refreshUser();
              if (playingItem.progress !== undefined || !selectedItem) {
                setCurrentView('home');
              } else {
                setCurrentView(playingItem.type === 'live' ? 'home' : 'detail');
              }
            }} 
          />
        )}

        {currentView === 'account' && (
          <Account onBack={() => setCurrentView('home')} />
        )}
      </main>
    </div>
  );
}
