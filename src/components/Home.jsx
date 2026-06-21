import React, { useMemo, useRef, useEffect } from 'react';
import { Play, Info, Search, RefreshCw } from 'lucide-react';

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
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
      el.style.scrollSnapType = 'none';
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
      const walk = (x - startX) * 1.5;
      if (Math.abs(x - startX) > 8) hasDragged = true;
      el.scrollLeft = scrollLeft - walk;
    };
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
  currentTab,
  categories,
  streams,
  currentCategoryId,
  onSelectCategory,
  onItemSelect,
  searchQuery,
  setSearchQuery
}) {

  const heroItems = useMemo(() => {
    if (!streams || streams.length === 0) return [];
    if (searchQuery.trim() !== '') return [];
    const withLogos = streams.filter(s => s.stream_icon || s.cover);
    return withLogos.length >= 5 ? withLogos.slice(0, 5) : streams.slice(0, 5);
  }, [streams, searchQuery]);

  const rowsData = useMemo(() => {
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const filtered = streams.filter(s => s.name && s.name.toLowerCase().includes(query));
      return [{ title: 'نتائج البحث', items: filtered }];
    }

    if (currentCategoryId === 'all') {
      const grouped = {};
      streams.forEach(s => {
        if (!grouped[s.category_id]) grouped[s.category_id] = [];
        grouped[s.category_id].push(s);
      });
      return categories.map(cat => ({
        title: cat.category_name,
        items: (grouped[cat.category_id] || []).slice(0, 15)
      })).filter(row => row.items.length > 0);
    } else {
      const filtered = streams.filter(s => String(s.category_id) === String(currentCategoryId));
      const chunkSize = 15;
      const result = [];
      const catName = categories.find(c => String(c.category_id) === String(currentCategoryId))?.category_name || '';
      for (let i = 0; i < filtered.length; i += chunkSize) {
        result.push({
          title: `${catName} - جزء ${Math.floor(i / chunkSize) + 1}`,
          items: filtered.slice(i, i + chunkSize)
        });
      }
      return result;
    }
  }, [currentCategoryId, categories, streams, searchQuery]);

  const handleImageError = (e) => {
    if (e.target.dataset.error) return;
    e.target.dataset.error = true;
    e.target.src = 'https://placehold.co/256x384/111111/FFFFFF?text=No+Image';
  };

  const getLabel = () => {
    if (currentTab === 'live') return 'مباشر';
    if (currentTab === 'vod') return 'أفلام';
    if (currentTab === 'series') return 'مسلسلات';
    return '';
  };

  const isElectron = window.electronAPI !== undefined;

  const handleCheckUpdate = () => {
    if (isElectron) {
      window.electronAPI.checkForUpdates();
    }
  };

  return (
    <div className="premium-home">
      <div className="premium-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="premium-logo" style={{ cursor: 'pointer' }} onClick={() => { onSelectCategory('all'); setSearchQuery(''); }}>
          MY<span style={{ color: '#E50914' }}>IPTV</span>
        </h1>
        {isElectron && (
          <button 
            onClick={handleCheckUpdate}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: 'white', 
              padding: '8px 12px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <RefreshCw size={16} />
            تحديث
          </button>
        )}
      </div>

      {currentTab === 'search' && (
        <div style={{ padding: '0 24px', marginTop: '16px', marginBottom: '16px' }}>
          <div className="premium-search-wrapper" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center' }}>
            <Search className="premium-search-icon" size={20} />
            <input 
              type="text" 
              className="premium-search-input" 
              placeholder="ابحث..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{ fontSize: '16px', background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', marginRight: '8px' }}
            />
          </div>
        </div>
      )}

      {heroItems.length > 0 && currentTab !== 'search' && (
        <div className="premium-hero-slider">
          {heroItems.map((item, idx) => {
            const imageSrc = item.stream_icon || item.cover || `https://placehold.co/256x384/111111/FFFFFF?text=No+Image`;
            return (
              <div key={idx} className="premium-hero-slide" onClick={() => onItemSelect(item)}>
                <div className="premium-hero-ambient-glow" style={{ backgroundImage: `url(${imageSrc})` }}></div>
                <div className="premium-hero-bg">
                  <img src={imageSrc} alt="bg" onError={handleImageError} />
                </div>
                <div className="premium-hero-gradient"></div>
                <div className="premium-hero-content">
                  <h2 className="premium-hero-title">{item.name}</h2>
                  <div className="premium-hero-tags">
                    <span className="premium-tag hd">HD</span>
                    <span className="premium-tag group">{getLabel()}</span>
                  </div>
                  <div className="premium-hero-buttons">
                    <button className="premium-btn-primary" onClick={(e) => { e.stopPropagation(); onItemSelect(item); }}>
                      <Play fill="black" size={20} />
                      <span>{currentTab === 'live' ? 'شاهد الآن' : 'التفاصيل'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {currentTab !== 'search' && (
        <div className="premium-groups-wrapper">
          <DragScroll className="premium-groups-scroll">
            <button className={`premium-pill ${currentCategoryId === 'all' ? 'active' : ''}`} onClick={() => onSelectCategory('all')}>الكل</button>
            {categories.map((cat, idx) => (
              <button key={idx} className={`premium-pill ${String(currentCategoryId) === String(cat.category_id) ? 'active' : ''}`} onClick={() => onSelectCategory(cat.category_id)}>
                {cat.category_name}
              </button>
            ))}
          </DragScroll>
        </div>
      )}

      <div className="premium-rows-container">
        {rowsData.map((row, index) => (
          <div className="premium-row" key={index}>
            <h3 className="premium-row-title">{row.title}</h3>
            <DragScroll className="premium-row-scroll">
              {row.items.map((item, idx) => {
                const imageSrc = item.stream_icon || item.cover || `https://placehold.co/256x384/111111/FFFFFF?text=No+Image`;
                const isVertical = currentTab === 'vod' || currentTab === 'series';
                return (
                  <div className={`premium-card ${isVertical ? 'vertical-card' : ''}`} key={idx} onClick={() => onItemSelect(item)}>
                    <div className="premium-card-image-wrapper">
                      <img src={imageSrc} alt={item.name} className="premium-card-img" onError={handleImageError} />
                      <div className="premium-card-overlay">
                        <Play fill="white" size={32} />
                      </div>
                      {currentTab === 'live' && <div className="premium-card-badge">مباشر</div>}
                    </div>
                    <span className="premium-card-title">{item.name}</span>
                  </div>
                );
              })}
            </DragScroll>
          </div>
        ))}
      </div>
      
      <div style={{ height: '100px' }}></div>
    </div>
  );
}
