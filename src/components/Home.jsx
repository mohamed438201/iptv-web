import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Play, Info, Search } from 'lucide-react';

// DragScroll component handles mouse drag to scroll on desktop and touch on mobile
function DragScroll({ className, children, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX;
    let scrollLeft;
    let hasDragged = false;

    const onMouseDown = (e) => {
      // Only drag on left click
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
      el.style.scrollSnapType = 'none'; // Temporarily disable snapping during drag
    };

    const onMouseLeave = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');
      el.style.scrollSnapType = '';
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');
      el.style.scrollSnapType = '';
      
      if (hasDragged) {
        // Prevent click event on children if we actually dragged
        const preventClick = (event) => {
          event.stopImmediatePropagation();
          el.removeEventListener('click', preventClick, true);
        };
        el.addEventListener('click', preventClick, true);
      }
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5; // Scroll speed
      if (Math.abs(x - startX) > 8) {
        hasDragged = true;
      }
      el.scrollLeft = scrollLeft - walk;
    };

    // Set initial cursor
    el.style.cursor = 'grab';

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}

export default function Home({ 
  channels, 
  groups, 
  currentGroup, 
  onSelectGroup, 
  onChannelSelect
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const heroChannels = useMemo(() => {
    if (!channels || channels.length === 0) return [];
    if (searchQuery.trim() !== '') return []; // Hide hero when searching
    const withLogos = channels.filter(c => c.logo);
    if (withLogos.length >= 5) return withLogos.slice(0, 5);
    return channels.slice(0, 5);
  }, [channels, searchQuery]);

  const rowsData = useMemo(() => {
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const filtered = channels.filter(c => c.name && c.name.toLowerCase().includes(query));
      return [{
        title: 'نتائج البحث',
        channels: filtered
      }];
    }

    if (currentGroup === 'All') {
      return Object.keys(groups).map(groupName => ({
        title: groupName,
        channels: groups[groupName].slice(0, 15)
      })).filter(row => row.channels.length > 0);
    } else {
      if (!channels || channels.length === 0) return [];
      const chunkSize = 15;
      const result = [];
      const groupChannels = groups[currentGroup] || channels;
      for (let i = 0; i < groupChannels.length; i += chunkSize) {
        result.push({
          title: `${currentGroup} - جزء ${Math.floor(i / chunkSize) + 1}`,
          channels: groupChannels.slice(i, i + chunkSize)
        });
      }
      return result;
    }
  }, [currentGroup, groups, channels, searchQuery]);

  const handleImageError = (e) => {
    if (e.target.dataset.error) return;
    e.target.dataset.error = true;
    e.target.src = 'https://placehold.co/256x256/111111/FFFFFF?text=TV';
  };

  return (
    <div className="premium-home">
      
      {/* Absolute Premium Top Bar */}
      <div className="premium-top-bar">
        <h1 className="premium-logo" style={{ cursor: 'pointer' }} onClick={() => { onSelectGroup('All'); setSearchQuery(''); }}>
          MY<span style={{ color: '#E50914' }}>IPTV</span>
        </h1>
        <div className="premium-top-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="premium-search-wrapper">
            <Search className="premium-search-icon" size={16} />
            <input 
              type="text" 
              className="premium-search-input" 
              placeholder="ابحث عن قناة..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span style={{ color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'none' }} onClick={() => { onSelectGroup('All'); setSearchQuery(''); }}>الرئيسية</span>
        </div>
      </div>

      {/* Hero Section */}
      {heroChannels.length > 0 && (
        <div className="premium-hero-slider">
          {heroChannels.map((featuredChannel, idx) => {
            const imageSrc = featuredChannel.logo || `https://placehold.co/256x256/111111/FFFFFF?text=TV`;
            return (
              <div 
                key={idx} 
                className="premium-hero-slide" 
                onClick={() => onChannelSelect(featuredChannel)}
              >
                <div className="premium-hero-ambient-glow" style={{ backgroundImage: `url(${imageSrc})` }}></div>
                <div className="premium-hero-bg">
                  <img src={imageSrc} alt="bg" onError={handleImageError} />
                </div>
                <div className="premium-hero-vignette"></div>
                <div className="premium-hero-gradient"></div>
                
                <div className="premium-hero-content">
                  {featuredChannel.logo ? (
                    <img 
                      src={imageSrc} 
                      alt="Logo" 
                      className="premium-hero-logo" 
                      onError={handleImageError} 
                    />
                  ) : (
                    <h2 className="premium-hero-title">{featuredChannel.name}</h2>
                  )}
                  
                  <div className="premium-hero-tags">
                    <span className="premium-tag match">98% نسبة مطابقة</span>
                    <span className="premium-tag age">+12</span>
                    <span className="premium-tag hd">HD</span>
                    <span className="premium-tag group">{featuredChannel.group || 'بث مباشر'}</span>
                  </div>

                  <div className="premium-hero-buttons">
                    <button className="premium-btn-primary" onClick={(e) => { e.stopPropagation(); onChannelSelect(featuredChannel); }}>
                      <Play fill="black" size={20} />
                      <span>شاهد الآن</span>
                    </button>
                    <button className="premium-btn-secondary" onClick={(e) => { e.stopPropagation(); onChannelSelect(featuredChannel); }}>
                      <Info size={20} />
                      <span>التفاصيل</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pill Groups Menu */}
      <div className="premium-groups-wrapper">
        <DragScroll className="premium-groups-scroll">
          <button 
            className={`premium-pill ${currentGroup === 'All' ? 'active' : ''}`} 
            onClick={() => onSelectGroup('All')}
          >
            الكل
          </button>
          {Object.keys(groups || {}).map((g, idx) => (
            <button 
              key={idx} 
              className={`premium-pill ${currentGroup === g ? 'active' : ''}`} 
              onClick={() => onSelectGroup(g)}
            >
              {g}
            </button>
          ))}
        </DragScroll>
      </div>

      {/* Horizontal Rows */}
      <div className="premium-rows-container">
        {rowsData.map((row, index) => (
          <div className="premium-row" key={index}>
            <h3 className="premium-row-title">{row.title}</h3>
            <DragScroll className="premium-row-scroll">
              {row.channels.map((channel, idx) => {
                const imageSrc = channel.logo || `https://placehold.co/256x256/111111/FFFFFF?text=TV`;
                return (
                  <div className="premium-card" key={idx} onClick={() => onChannelSelect(channel)}>
                    <div className="premium-card-image-wrapper">
                      <img 
                        src={imageSrc} 
                        alt={channel.name} 
                        className="premium-card-img"
                        onError={handleImageError} 
                      />
                      <div className="premium-card-overlay">
                        <Play fill="white" size={32} />
                      </div>
                      <div className="premium-card-badge">مباشر</div>
                    </div>
                    <span className="premium-card-title">{channel.name}</span>
                  </div>
                );
              })}
            </DragScroll>
          </div>
        ))}
      </div>
      
      {/* Spacing for Bottom Nav */}
      <div style={{ height: '100px' }}></div>
    </div>
  );
}
