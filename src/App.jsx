import React, { useState, useEffect, useMemo } from 'react';
import Home from './components/Home';
import ChannelDetail from './components/ChannelDetail';
import Player from './components/Player';
import { Home as HomeIcon, Search, Play, MonitorPlay } from 'lucide-react';

export default function App() {
  const [allChannels, setAllChannels] = useState([]);
  const [groups, setGroups] = useState({});
  const [currentGroup, setCurrentGroup] = useState('All');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentView, setCurrentView] = useState('home');
  const [selectedChannel, setSelectedChannel] = useState(null);
  
  const [currentTab, setCurrentTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  
  const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
  
  const ACCOUNTS = [
    { host: 'http://xc.nv2.xyz:80', user: 'gamila2026', pass: 'gamila2026', proxy: '/nv2' },
    { host: 'http://ea.saidisat.com:80', user: 'cnk6uc7hr9', pass: '4v8rzl4823', proxy: '/saidi' }
  ];

  useEffect(() => {
    fetchPlaylist();
  }, []);

  const fetchPlaylist = async () => {
    setIsLoading(true);
    setError(null);
    let success = false;

    for (const acc of ACCOUNTS) {
      try {
        const baseUrl = isNativeApp ? acc.host : acc.proxy;
        
        // 1. Try standard M3U endpoint
        const m3uUrl = `${baseUrl}/get.php?username=${acc.user}&password=${acc.pass}&type=m3u_plus&output=m3u8`;
        const m3uResponse = await fetch(m3uUrl);
        
        if (m3uResponse.ok) {
          const text = await m3uResponse.text();
          if (text && text.includes('#EXTINF')) {
            parseM3U(text, acc);
            success = true;
            break;
          }
        }
        
        // 2. Fallback to Xtream Codes JSON API
        const catUrl = `${baseUrl}/player_api.php?username=${acc.user}&password=${acc.pass}&action=get_live_categories`;
        const streamsUrl = `${baseUrl}/player_api.php?username=${acc.user}&password=${acc.pass}&action=get_live_streams`;
        
        const [catRes, streamsRes] = await Promise.all([
          fetch(catUrl),
          fetch(streamsUrl)
        ]);
        
        if (catRes.ok && streamsRes.ok) {
          const categories = await catRes.json();
          const streams = await streamsRes.json();
          
          if (Array.isArray(categories) && Array.isArray(streams)) {
            parseJSONAPI(categories, streams, acc);
            success = true;
            break;
          }
        }
      } catch (err) {
        console.log(`Failed to load from ${acc.host}`, err);
      }
    }

    if (!success) {
      setError('Failed to load playlist from all available servers. Please check your network or CORS settings.');
      setIsLoading(false);
    }
  };

  const parseM3U = (data, activeAccount) => {
    const lines = data.split('\n');
    const parsedChannels = [];
    const parsedGroups = {};
    let currentChannelInfo = {};
    let currentPlaylistGroup = "Uncategorized";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        const info = line.substring(8);
        const nameMatch = info.match(/,(.+)$/);
        const logoMatch = info.match(/tvg-logo="([^"]+)"/);
        const groupMatch = info.match(/group-title="([^"]+)"/);

        let name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
        let logo = logoMatch ? logoMatch[1] : '';
        
        let isMarker = name.includes('---') || name.includes('===');
        if (isMarker) {
          currentPlaylistGroup = name.replace(/[-=•●★⚽]/g, '').trim();
        }

        let group = groupMatch && groupMatch[1].trim() !== "" ? groupMatch[1].trim() : currentPlaylistGroup;

        currentChannelInfo = { name, logo, group, isMarker };
      } else if (line.startsWith('http')) {
        if (Object.keys(currentChannelInfo).length > 0) {
          if (!currentChannelInfo.isMarker) {
            let safeUrl = line;
            if (!isNativeApp) {
              if (safeUrl.startsWith(activeAccount.host)) {
                safeUrl = safeUrl.replace(activeAccount.host, activeAccount.proxy);
              }
            }
            currentChannelInfo.url = safeUrl;
            parsedChannels.push(currentChannelInfo);

            if (!parsedGroups[currentChannelInfo.group]) {
              parsedGroups[currentChannelInfo.group] = [];
            }
            parsedGroups[currentChannelInfo.group].push(currentChannelInfo);
          }
          currentChannelInfo = {};
        }
      }
    }

    if (parsedChannels.length > 0) {
      setAllChannels(parsedChannels);
      setGroups(parsedGroups);
      setCurrentGroup('All');
    } else {
      setError('No valid channels found.');
    }
    setIsLoading(false);
  };

  const parseJSONAPI = (categories, streams, activeAccount) => {
    const parsedChannels = [];
    const parsedGroups = {};
    
    // Map category ID to Category Name
    const catMap = {};
    categories.forEach(c => {
      catMap[String(c.category_id)] = c.category_name;
    });
    
    streams.forEach(stream => {
      let groupName = catMap[String(stream.category_id)] || "Uncategorized";
      let safeUrl = `${activeAccount.host}/live/${activeAccount.user}/${activeAccount.pass}/${stream.stream_id}.m3u8`;
      
      if (!isNativeApp) {
        safeUrl = safeUrl.replace(activeAccount.host, activeAccount.proxy);
      }
      
      let currentChannelInfo = {
        name: stream.name,
        logo: stream.stream_icon || '',
        group: groupName,
        isMarker: false,
        url: safeUrl
      };
      
      parsedChannels.push(currentChannelInfo);
      if (!parsedGroups[groupName]) {
        parsedGroups[groupName] = [];
      }
      parsedGroups[groupName].push(currentChannelInfo);
    });
    
    if (parsedChannels.length > 0) {
      setAllChannels(parsedChannels);
      setGroups(parsedGroups);
      setCurrentGroup('All');
    } else {
      setError('No valid channels found via API.');
    }
    setIsLoading(false);
  };

  const displayedChannels = useMemo(() => {
    return currentGroup === 'All' ? allChannels : (groups[currentGroup] || []);
  }, [currentGroup, groups, allChannels]);

  const handleChannelSelect = (channel) => {
    if (!channel) return;
    setSelectedChannel(channel);
    setCurrentView('detail');
  };

  const handlePlay = (channel) => {
    if (!channel) return;
    setSelectedChannel(channel);
    setCurrentView('player');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedChannel(null);
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', direction: 'rtl' }}>
        <div className="loader"></div>
        <p style={{ marginTop: '16px', color: '#888' }}>جاري تحميل القنوات المميزة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center', direction: 'rtl' }}>
        <h2 style={{ color: '#E50914', marginBottom: '16px' }}>حدث خطأ</h2>
        <p>{error}</p>
        <button onClick={fetchPlaylist} style={{ marginTop: '24px', padding: '12px 24px', background: '#333', color: 'white', border: 'none', borderRadius: '8px' }}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {currentView === 'home' && (
        <Home 
          channels={displayedChannels}
          groups={groups}
          currentGroup={currentGroup}
          onSelectGroup={setCurrentGroup}
          onChannelSelect={handleChannelSelect}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentTab={currentTab}
        />
      )}
      
      {currentView === 'detail' && selectedChannel && (
        <ChannelDetail 
          channel={selectedChannel}
          groupChannels={groups[selectedChannel.group]}
          onBack={handleBackToHome}
          onPlay={handlePlay}
          onSelectRelated={handleChannelSelect}
        />
      )}
      
      {currentView === 'player' && selectedChannel && (
        <Player channel={selectedChannel} onBack={handleBackToHome} />
      )}

      {currentView === 'home' && (
        <div className="bottom-nav-container">
          <div className="bottom-nav" style={{ direction: 'rtl' }}>
            <button 
              className={`nav-item ${currentTab === 'home' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('home'); setSearchQuery(''); setCurrentGroup('All'); }}
            >
              <HomeIcon size={24} /><span>الرئيسية</span>
            </button>
            <button 
              className={`nav-item ${currentTab === 'search' ? 'active' : ''}`}
              onClick={() => setCurrentTab('search')}
            >
              <Search size={24} /><span>البحث</span>
            </button>
            <button 
              className={`nav-item ${currentTab === 'live' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('live'); setCurrentGroup('بث مباشر'); }}
            >
              <MonitorPlay size={24} /><span>مباشر</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
