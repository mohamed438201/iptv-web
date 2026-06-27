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
import MyList from './components/MyList';
import Collections from './components/Collections';
import Downloads from './components/Downloads';
import AutoUpdater from './components/AutoUpdater';
import WindowControls from './components/WindowControls';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Home as HomeIcon, Search, MonitorPlay, Film, Tv } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { buildXtreamApiUrl, buildXtreamStreamUrl, buildXtreamHostApiUrl } from './services/xtream';

export default function App() {
  const { user, activeProfile, logout, refreshUser } = useAuth();
  const [authView, setAuthView] = useState('login');

  const navigate = useNavigate();
  const location = useLocation();

  // Data States
  const [liveCategories, setLiveCategories] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [vodCategories, setVodCategories] = useState([]);
  const [vodStreams, setVodStreams] = useState([]);
  const [seriesCategories, setSeriesCategories] = useState([]);
  const [seriesStreams, setSeriesStreams] = useState([]);

  // UI States
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [loadingText, setLoadingText] = useState('جاري الاتصال بالسيرفر...');
  const [error, setError] = useState(null);

  // Navigation States
  const [currentView, setCurrentView] = useState('home'); // home, detail, player
  const [selectedItem, setSelectedItem] = useState(null);
  const [playingItem, setPlayingItem] = useState(null);
  const [currentTab, setCurrentTab] = useState('home'); // home, live, vod, series, search
  const [currentCategoryId, setCurrentCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [playingEpisodes, setPlayingEpisodes] = useState([]);
  const [playingSeriesInfo, setPlayingSeriesInfo] = useState(null);

  // OTA States
  const [updateMessage, setUpdateMessage] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Offline Mode State
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [offlineToast, setOfflineToast] = useState(false);

  const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));

  // Only the specified server
  const SERVER = { host: 'http://b1718o.top:80', user: '2366901490', pass: '7312171749', proxy: '/b17' };

  const fetchedPlanRef = React.useRef(null);

  useEffect(() => {
    setupOTAUpdaters();

    const handleOffline = () => setIsOfflineMode(true);
    const handleOnline = () => {
      setIsOfflineMode(false);
      setOfflineToast(false);
      if (user?.paymentStatus === 'active' && user?.planId) {
        fetchAllData(user.planId);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine && isNativeApp) {
      setOfflineToast(true);
      setIsDataLoading(false);
      setIsHeroReady(true);
      setCurrentView('downloads');
      navigate('/downloads');
      setTimeout(() => setOfflineToast(false), 5000);
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (user && user.paymentStatus === 'active' && !isOfflineMode) {
      if (fetchedPlanRef.current !== user.planId) {
        fetchedPlanRef.current = user.planId;
        fetchAllData(user.planId);
      }
    }
  }, [user?.id, user?.planId, user?.paymentStatus, isOfflineMode]);

  useEffect(() => {
    if (isDataLoading) return; // Wait for data to be loaded before syncing

    const path = location.pathname;

    if (path.startsWith('/detail/')) {
      const parts = path.split('/');
      const type = parts[2];
      const id = parts[3];

      let item = null;
      if (type === 'vod') item = vodStreams.find(s => String(s.stream_id) === String(id));
      if (type === 'series') item = seriesStreams.find(s => String(s.series_id) === String(id));

      if (item) {
        const enhancedItem = {
          ...item,
          url: generatePlayUrl(id, type === 'vod' ? 'movie' : 'series', item.container_extension || 'mp4'),
          type: type,
          name: item.name || item.title,
          logo: item.stream_icon || item.cover || ''
        };
        setSelectedItem(enhancedItem);
        setCurrentView('detail');
      } else {
        navigate('/home', { replace: true });
      }
    } else if (path.startsWith('/play/')) {
      const parts = path.split('/');
      const type = parts[2];
      const id = parts[3];

      if (location.state?.offlineItem) {
        setPlayingItem(location.state.offlineItem);
        setCurrentView('player');
        return;
      }

      let item = null;
      if (type === 'live') {
        item = liveStreams.find(s => String(s.stream_id) === String(id));
      } else if (type === 'vod') {
        item = vodStreams.find(s => String(s.stream_id) === String(id));
      } else if (type === 'series') {
        const season = parts[4];
        const episodeNum = parts[5];
        // Fetch series info asynchronously if needed
        fetchData('get_series_info', { series_id: id }).then(seriesData => {
          const eps = seriesData?.episodes ? Object.values(seriesData.episodes).flat() : [];
          const ep = eps.find(e => String(e.season) === String(season) && String(e.episode_num) === String(episodeNum));
          if (ep) {
            const playUrl = generatePlayUrl(ep.id, 'series', ep.container_extension || 'mp4');
            const enhancedEp = {
              ...ep,
              url: playUrl,
              type: 'series',
              name: ep.title,
              logo: ep.info?.movie_image || ep.info?.cover || '',
              progress: location.state?.progress
            };
            setPlayingEpisodes(eps);
            setPlayingSeriesInfo({
              ...(seriesData?.info || {}),
              series_id: id
            });
            setPlayingItem(enhancedEp);
            setCurrentView('player');
          }
        }).catch(() => {
          navigate('/home');
        });
        return; // async handles it
      }

      if (item && type !== 'series') {
        const enhancedItem = {
          ...item,
          url: generatePlayUrl(id, type === 'live' ? 'live' : 'movie', type === 'live' ? 'm3u8' : (item.container_extension || 'mp4')),
          type: type,
          name: item.name,
          logo: item.stream_icon || item.cover || '',
          progress: location.state?.progress
        };
        setPlayingItem(enhancedItem);
        setCurrentView('player');
      }
    } else if (path.startsWith('/account')) {
      setCurrentView('account');
    } else if (path.startsWith('/mylist')) {
      setCurrentView('mylist');
    } else if (path.startsWith('/collections')) {
      setCurrentView('collections');
    } else if (path.startsWith('/downloads')) {
      setCurrentView('downloads');
    } else {
      setCurrentView('home');
      if (path.startsWith('/home/')) {
        const tab = path.split('/')[2];
        if (['home', 'live', 'vod', 'series'].includes(tab)) {
          setCurrentTab(tab);
        }
      }
    }
  }, [location.pathname, isDataLoading, liveStreams, vodStreams, seriesStreams]);

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
    const finalUrl = buildXtreamApiUrl(SERVER, action, params);

    if (window.electronAPI && window.electronAPI.fetchApi) {
      // Electron needs the host url directly, our helper returns proxy or host based on environment
      const fullUrl = buildXtreamHostApiUrl(SERVER, action, params);
      const res = await window.electronAPI.fetchApi(fullUrl);
      if (!res.ok) throw new Error(`Server Error: ${res.status} ${res.error || ''}`);
      return res.data;
    }

    const response = await fetch(finalUrl);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    return await response.json();
  };

  const fetchAllData = async (planId) => {
    setIsDataLoading(true);
    setIsHeroReady(false);
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

      setIsDataLoading(false);
    } catch (err) {
      console.error("Fetch Data Error:", err);
      setError('تعذر الاتصال بالسيرفر أو جلب البيانات. تأكد من اتصالك بالانترنت.');
      setIsDataLoading(false);
    }
  };

  const generatePlayUrl = (streamId, type = 'live', extension = 'm3u8') => {
    return buildXtreamStreamUrl(SERVER, type, streamId, extension);
  };

  const handleSelect = async (item, type) => {
    if (!item) return;
    setIsSearchOpen(false); // Close search overlay if open

    // Check if it's an offline item
    if (item.isOffline) {
      setPlayingItem(item);
      setCurrentView('player');
      navigate(`/play/${item.type || 'vod'}/${item.id}`, { state: { offlineItem: item } });
      return;
    }

    // Check if it's a "Continue Watching" item
    if (item.progress !== undefined) {
      if (item.type === 'series') {
        const seriesId = item.series_id || item.id || item.stream_id;
        navigate(`/play/series/${seriesId}/${item.season}/${item.episode_num}`, { state: { progress: item.progress } });
        return;
      } else {
        const id = item.stream_id || item.id;
        navigate(`/play/vod/${id}`, { state: { progress: item.progress } });
        return;
      }
    }

    let isMovieOrSeries = type === 'vod' || type === 'series';
    const id = item.stream_id || item.series_id || item.id;

    if (isMovieOrSeries) {
      navigate(`/detail/${type}/${id}`);
    } else {
      navigate(`/play/${type}/${id}`);
    }
  };

  const handlePlay = (item, episodes = [], seriesInfo = null) => {
    if (!item) return;
    setPlayingEpisodes(episodes);
    setPlayingSeriesInfo(seriesInfo);

    // For series, play the specific episode selected
    if (item.type === 'series') {
      navigate(`/play/series/${item.series_id || seriesInfo?.series_id || item.id}/${item.season}/${item.episode_num}`);
      return;
    }

    const id = item.stream_id || item.id;
    navigate(`/play/${item.type || 'vod'}/${id}`);
  };

  const handlePlayEpisode = (ep) => {
    if (!ep) return;
    navigate(`/play/series/${playingSeriesInfo?.series_id || selectedItem?.series_id}/${ep.season}/${ep.episode_num}`, { replace: true });
  };

  const getDaysLeft = (dateString) => {
    if (!dateString) return null;
    const end = new Date(dateString);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (!user && !isOfflineMode) {
    if (authView === 'login') return <Login onNavigate={setAuthView} />;
    return <Register onNavigate={setAuthView} />;
  }

  if (user && user.email === 'admin@iptv.com' && !isOfflineMode) {
    return <AdminDashboard />;
  }

  if (user && user.paymentStatus === 'banned' && !isOfflineMode) {
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

  const daysLeft = user ? getDaysLeft(user.subscriptionEndDate) : null;
  const isExpired = user && user.paymentStatus === 'active' && daysLeft === 0;

  if (!isOfflineMode && user && (!user.planId || isExpired || currentView === 'renew')) {
    return <Plans onCancel={currentView === 'renew' ? () => setCurrentView('account') : null} />;
  }

  if (user && user.paymentStatus === 'pending' && !isOfflineMode) {
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

  if (!activeProfile && !isOfflineMode) {
    return <ProfileSelection onManageProfiles={() => {
      if (user.profiles && user.profiles.length > 0) {
        selectProfile(user.profiles[0].id);
        setCurrentView('account');
      }
    }} />;
  }

  if (error && !isOfflineMode) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center', direction: 'rtl' }}>
        <h2 style={{ color: '#E50914', marginBottom: '16px' }}>حدث خطأ</h2>
        <p>{error}</p>
        <button onClick={() => fetchAllData(user?.planId)} className="retry-btn" style={{ marginTop: '24px' }}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <>
      {offlineToast && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: '#ff9500', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 10000, fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          No internet connection. You can watch your downloaded content.
        </div>
      )}

      {(!isOfflineMode && (isDataLoading || !isHeroReady)) && (
        <div className="cinematic-loader-overlay">
          <div className="cinematic-loader-bg"></div>
          <div className="cinematic-loader-content">
            <h1 style={{ color: '#E50914', fontSize: '40px', fontWeight: 'bold', marginBottom: '30px', letterSpacing: '4px', textTransform: 'uppercase' }}>
              IPTV PREMIUM
            </h1>
            <div className="netflix-spinner"></div>
            <p className="cinematic-text">Loading your experience...</p>
          </div>
        </div>
      )}

      <div className="app-container" style={{ display: (!isOfflineMode && (isDataLoading || !isHeroReady)) ? 'none' : 'flex' }}>
        {currentView !== 'player' && (
          <Navbar
            currentView={currentView}
            setCurrentView={setCurrentView}
            currentTab={currentTab}
            setCurrentTab={(tab) => {
              if (tab === 'home' && !isOfflineMode) refreshUser();
              navigate(`/home/${tab}`);
            }}
            onSearchClick={() => setIsSearchOpen(true)}
            onProfileClick={() => navigate('/account')}
            onMyListClick={() => navigate('/mylist')}
            onCollectionsClick={() => navigate('/collections')}
            onDownloadsClick={() => navigate('/downloads')}
            isOfflineMode={isOfflineMode}
          />
        )}

        {isSearchOpen && !isOfflineMode && (
          <AdvancedSearch
            liveStreams={liveStreams}
            vodStreams={vodStreams}
            seriesStreams={seriesStreams}
            onClose={() => setIsSearchOpen(false)}
            onItemSelect={handleSelect}
          />
        )}

        <main className="app-main-content">
          <AutoUpdater />

          {currentView === 'home' && !isOfflineMode && (
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
              onHeroReady={() => setIsHeroReady(true)}
            />
          )}

          {currentView === 'detail' && selectedItem && (
            <ChannelDetail
              item={selectedItem}
              server={SERVER}
              onBack={() => navigate('/home')}
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
                navigate(-1);
              }}
            />
          )}

          {currentView === 'account' && (
            <Account onBack={() => navigate('/home')} />
          )}

          {currentView === 'mylist' && (
            <MyList onItemSelect={(item, type) => handleSelect(item, type)} />
          )}

          {currentView === 'collections' && (
            <Collections onItemSelect={(item, type) => handleSelect(item, type)} />
          )}

          {currentView === 'downloads' && (
            <Downloads onItemSelect={(item, type) => handleSelect(item, type)} />
          )}
        </main>
        <WindowControls />
      </div>
    </>
  );
}
