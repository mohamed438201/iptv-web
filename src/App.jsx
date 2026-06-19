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
  
  const isNativeApp = window.Capacitor !== undefined || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
  const BASE_URL = isNativeApp ? 'http://ugeen.live:8080' : '/live';
  const XTREAM_URL = `${BASE_URL}/get.php?username=Ugeen_VIP8Spjx2&password=p0Sy3J&type=m3u_plus&output=m3u8`;

  useEffect(() => {
    fetchPlaylist();
  }, []);

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(XTREAM_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      parseM3U(text);
    } catch (err) {
      setError('Failed to load playlist. Please check your network or CORS settings.');
      setIsLoading(false);
    }
  };

  const parseM3U = (data) => {
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
              if (safeUrl.startsWith('http://ugeen.live:8080')) {
                safeUrl = safeUrl.replace('http://ugeen.live:8080', '/live');
              } else if (safeUrl.startsWith('http://ugeen.live')) {
                safeUrl = safeUrl.replace('http://ugeen.live', '/live');
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
            <button className="nav-item active"><HomeIcon size={24} /><span>الرئيسية</span></button>
            <button className="nav-item"><Search size={24} /><span>البحث</span></button>
            <button className="nav-item"><MonitorPlay size={24} /><span>مباشر</span></button>
          </div>
        </div>
      )}
    </div>
  );
}
