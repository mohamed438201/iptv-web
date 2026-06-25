import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Play, Download, ThumbsDown, ThumbsUp, Plus, Check, VolumeX, Volume2, ChevronRight, ChevronLeft, Clock } from 'lucide-react';
import { UniversalCard } from './Cards';
import { getTmdbDetails } from '../services/tmdb';
import YouTube from 'react-youtube';
import { useAuth } from '../contexts/AuthContext';

function RowScroll({ title, items, isVertical, onItemSelect, onExploreAll }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowLeft(scrollRef.current.scrollLeft > 20);
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -800, behavior: 'smooth' });
  };
  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 800, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="netflix-row">
      <h2 className="row-title">
        {title} {onExploreAll && <span className="explore-all" onClick={onExploreAll}>Explore All <ChevronRight size={14}/></span>}
      </h2>
      <div className="row-container">
        {showLeft && <button className="slider-arrow left" onClick={scrollLeft}><ChevronLeft size={36} /></button>}
        <div className="row-scroll-area" ref={scrollRef} onScroll={handleScroll}>
          {items.map((item, idx) => (
            <UniversalCard key={idx} item={item} onClick={(clickedItem) => onItemSelect(clickedItem, clickedItem._type)} />
          ))}
        </div>
        <button className="slider-arrow right" onClick={scrollRight}><ChevronRight size={36} /></button>
      </div>
    </div>
  );
}

export default function Home({ 
  currentTab,
  setCurrentTab,
  categories,
  streams,
  liveCategories,
  liveStreams,
  vodCategories,
  vodStreams,
  seriesCategories,
  seriesStreams,
  currentCategoryId,
  onSelectCategory,
  onItemSelect,
  searchQuery,
  setSearchQuery,
  onHeroReady
}) {
  const { activeProfile, user, toggleRating, toggleCollection } = useAuth();

  const [visibleRows, setVisibleRows] = useState(10);
  const [heroItems, setHeroItems] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [ytPlayer, setYtPlayer] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const observerRef = useRef(null);

  const ytOpts = useMemo(() => ({
    width: '100%',
    height: '140%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      loop: 0,
      disablekb: 1,
      fs: 0,
      mute: 1 // Start muted initially, toggleMute handles the rest without reloading
    }
  }), []);

  const heroItem = heroItems[heroIndex] || null;
  const tmdbData = heroItem?.tmdbData || null;

  useEffect(() => {
    setVisibleRows(10);
  }, [currentTab, currentCategoryId, searchQuery]);

  useEffect(() => {
    let taggedItems = [];
    if (currentTab === 'home') {
      let combined = [];
      if (user?.planId === 'sports') {
        combined = [...(liveStreams || []).slice(0, 30).map(l => ({...l, _type: 'live'}))];
      } else if (user?.planId === 'basic') {
        combined = [
          ...(vodStreams || []).slice(0, 15).map(v => ({...v, _type: 'vod'})), 
          ...(seriesStreams || []).slice(0, 15).map(s => ({...s, _type: 'series'}))
        ];
      } else {
        combined = [
          ...(vodStreams || []).slice(0, 15).map(v => ({...v, _type: 'vod'})), 
          ...(seriesStreams || []).slice(0, 15).map(s => ({...s, _type: 'series'}))
        ];
      }
      taggedItems = combined;
    } else {
      const type = currentTab === 'vod' ? 'vod' : (currentTab === 'series' ? 'series' : 'live');
      let filteredStreams = streams || [];
      if (currentCategoryId !== 'all') {
        filteredStreams = filteredStreams.filter(s => String(s.category_id) === String(currentCategoryId));
      }
      taggedItems = filteredStreams.map(s => ({...s, _type: type}));
    }
    
    if (taggedItems.length > 0) {
      const topStreams = taggedItems.slice(0, 30);
      const shuffled = [...topStreams].sort(() => 0.5 - Math.random()).slice(0, 20);
      
      let isMounted = true;
      const fetchValidItems = async () => {
        const validItems = [];
        for (const item of shuffled) {
          if (validItems.length >= 7) break; // keep up to 7 hero items
          
          if (item._type === 'live') {
            validItems.push({ ...item, tmdbData: null });
            continue;
          }

          const tmdb = await getTmdbDetails(item, item._type);
          if (tmdb && (tmdb.backdropUrl || tmdb.trailerKey)) {
            validItems.push({ ...item, tmdbData: tmdb });
          }
        }
        if (isMounted && validItems.length > 0) {
          setHeroItems(validItems);
          setHeroIndex(0);
        }
        if (isMounted && onHeroReady) {
          onHeroReady();
        }
      };
      
      fetchValidItems();
      return () => { isMounted = false; };
    } else {
      if (onHeroReady) onHeroReady();
    }
  }, [streams, currentTab, vodStreams, seriesStreams]);

  useEffect(() => {
    if (heroItems.length === 0) return;
    
    // Pause auto-slider if video is actively playing
    if (isVideoPlaying) return;

    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroItems.length);
    }, 15000); // 15s interval when video is NOT playing
    
    return () => clearInterval(interval);
  }, [heroItems, isVideoPlaying]);

  useEffect(() => {
    setIsVideoPlaying(false);
    if (tmdbData?.trailerKey) {
      const timer = setTimeout(() => {
        setIsVideoPlaying(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [heroIndex, tmdbData]);

  useEffect(() => {
    const handleScroll = () => {
      if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
        if (window.scrollY > 300) {
          ytPlayer.pauseVideo();
        } else {
          ytPlayer.playVideo();
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ytPlayer]);

  const toggleMute = () => {
    if (ytPlayer && typeof ytPlayer.isMuted === 'function') {
      try {
        if (ytPlayer.isMuted()) {
          ytPlayer.unMute();
          setIsMuted(false);
        } else {
          ytPlayer.mute();
          setIsMuted(true);
        }
      } catch (e) {
        setIsMuted(!isMuted);
      }
    } else {
      setIsMuted(!isMuted);
    }
  };

  const nextSlide = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsVideoPlaying(false);
    setHeroIndex(prev => (prev + 1) % heroItems.length);
  };

  const prevSlide = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsVideoPlaying(false);
    setHeroIndex(prev => (prev - 1 + heroItems.length) % heroItems.length);
  };

  const minSwipeDistance = 30;
  const onPointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    touchStartRef.current = e.clientX;
    touchEndRef.current = null;
  };
  const onPointerMove = (e) => {
    if (touchStartRef.current !== null) {
      touchEndRef.current = e.clientX;
    }
  };
  const onPointerUp = (e) => {
    if (touchStartRef.current !== null && touchEndRef.current !== null) {
      const distance = touchStartRef.current - touchEndRef.current;
      if (distance > minSwipeDistance) nextSlide();
      if (distance < -minSwipeDistance) prevSlide();
    }
    touchStartRef.current = null;
    touchEndRef.current = null;
    if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  const rowsData = useMemo(() => {
    if (currentTab === 'home') {
      const getRows = (cats, strms, type) => {
        if (!cats || !strms) return [];
        const grouped = {};
        strms.forEach(s => {
          if (!grouped[s.category_id]) grouped[s.category_id] = [];
          grouped[s.category_id].push({ ...s, _type: type });
        });
        return cats.slice(0, 4).map(cat => ({
          title: cat.category_name,
          categoryId: cat.category_id,
          type: type,
          items: (grouped[cat.category_id] || []).slice(0, 20)
        })).filter(row => row.items.length > 0);
      };

      let rows = [];
      if (user?.planId === 'sports') {
        rows = [...getRows(liveCategories, liveStreams, 'live')];
      } else if (user?.planId === 'basic') {
        rows = [
          ...getRows(vodCategories, vodStreams, 'vod'),
          ...getRows(seriesCategories, seriesStreams, 'series')
        ];
      } else {
        rows = [
          ...getRows(vodCategories, vodStreams, 'vod'),
          ...getRows(seriesCategories, seriesStreams, 'series'),
          ...getRows(liveCategories, liveStreams, 'live')
        ];
      }
      return rows;
    } else if (currentCategoryId === 'all') {
      const grouped = {};
      streams.forEach(s => {
        if (!grouped[s.category_id]) grouped[s.category_id] = [];
        grouped[s.category_id].push(s);
      });
      return categories.map(cat => ({
        title: cat.category_name,
        categoryId: cat.category_id,
        type: currentTab,
        items: (grouped[cat.category_id] || []).slice(0, 20)
      })).filter(row => row.items.length > 0);
    } else {
      const filtered = streams.filter(s => String(s.category_id) === String(currentCategoryId));
      return [{ title: categories.find(c => String(c.category_id) === String(currentCategoryId))?.category_name || '', items: filtered }];
    }
  }, [currentTab, currentCategoryId, categories, streams, liveCategories, liveStreams, vodCategories, vodStreams, seriesCategories, seriesStreams]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleRows((prev) => prev + 10);
        }
      },
      { rootMargin: '200px' }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [rowsData]);

  const isCollections = currentTab === 'collections';

  return (
    <div className="home-screen netflix-style">
      
      {/* Hero Section */}
      {heroItem && !isCollections && (
        <div className="netflix-hero">
          <div className="hero-bg">
            <img 
              key={`bg-${heroItem.stream_id}`} 
              src={tmdbData?.backdropUrl || heroItem.stream_icon || heroItem.cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(heroItem.name || 'Hero')}&background=111111&color=ffffff&size=1024`} 
              alt="Hero" 
              onError={(e) => { e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(heroItem.name || 'Hero')}&background=111111&color=ffffff&size=1024` }} 
              className="hero-fade-in" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', zIndex: 1 }}
            />
            {tmdbData?.trailerKey && (
              <YouTube
                videoId={tmdbData.trailerKey}
                opts={ytOpts}
                onReady={(e) => {
                  setYtPlayer(e.target);
                  if (isMuted) e.target.mute();
                  e.target.playVideo();
                }}
                onStateChange={(e) => {
                  if (e.data === YouTube.PlayerState.PLAYING) {
                    setIsVideoPlaying(true);
                  } else if (e.data === YouTube.PlayerState.ENDED) {
                    setIsVideoPlaying(false);
                    nextSlide({stopPropagation: () => {}}); 
                  } else if (e.data === YouTube.PlayerState.PAUSED) {
                    setIsVideoPlaying(false);
                  }
                }}
                onError={(e) => {
                  console.warn("YouTube Player Error:", e.data);
                  setIsVideoPlaying(false);
                  if (heroItem && heroItem.tmdbData) {
                    heroItem.tmdbData.trailerKey = null;
                  }
                }}
                style={{ 
                  width: '100%', height: '100%', position: 'absolute', top: '-20%', left: 0, 
                  objectFit: 'cover', pointerEvents: 'none', zIndex: 2,
                  opacity: isVideoPlaying ? 1 : 0, transition: 'opacity 1.5s ease-in-out'
                }}
                className="youtube-container"
              />
            )}
          </div>
          <div 
            className="hero-swipe-overlay" 
            style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5, cursor: 'grab', touchAction: 'pan-y'}}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          ></div>
          <div className="hero-vignette-top" style={{zIndex: 6}}></div>
          <div className="hero-vignette-bottom" style={{zIndex: 6}}></div>
          
          <div key={`content-${heroItem.stream_id}`} className="hero-content-wrapper hero-fade-in" style={{zIndex: 10}}>
            <div className="n-series-logo">
              <span className="n-icon" style={{color: '#E50914', fontWeight: 'bold', fontSize: '24px', marginRight: '8px'}}>IPTV</span> 
              {heroItem._type === 'vod' ? 'MOVIES' : (heroItem._type === 'series' ? 'SERIES' : 'LIVE')}
            </div>
            
            <h1 style={{fontSize: '3rem', fontWeight: '800', color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', margin: '16px 0', maxWidth: '60%'}}>
              {heroItem.name}
            </h1>
            
            <div className="hero-meta-info">
              <span className="imdb-badge-large">IMDb</span>
              <span className="rating">{heroItem.rating || '9.5'}</span>
              <span className="year">{heroItem.year || heroItem.added?.substring(0,4) || '2023'}</span>
              <span className="match">100% match</span>
            </div>
            
            <p className="hero-synopsis">
              {tmdbData?.overview || heroItem.plot || heroItem.description || ""}
            </p>
            
            <div className="hero-actions">
              <button className="btn btn-download" title="Download"><Download size={20} /></button>
              <button className="btn btn-play" onClick={() => onItemSelect(heroItem, heroItem._type)}>
                <Play size={24} fill="black" /> <span>Watch now</span>
              </button>
              
              {(() => {
                const streamId = String(heroItem?.series_id || heroItem?.stream_id || heroItem?.id);
                const libItem = activeProfile?.library?.find(l => l.stream_id === streamId) || {};
                
                return (
                  <>
                    <button 
                      className={`btn btn-icon ${libItem.rating === 'dislike' ? 'active-rating' : ''}`} 
                      onClick={(e) => { e.stopPropagation(); toggleRating(streamId, heroItem, 'dislike'); }}
                      style={{ color: libItem.rating === 'dislike' ? '#fff' : undefined }}
                    ><ThumbsDown size={20} fill={libItem.rating === 'dislike' ? 'white' : 'none'} /></button>
                    
                    <button 
                      className="btn btn-icon" 
                      onClick={(e) => { e.stopPropagation(); toggleCollection(streamId, heroItem); }}
                    >
                      {libItem.in_collection ? <Check size={20} className="icon-anim-check" /> : <Plus size={20} className="icon-anim-plus" />}
                    </button>
                    
                    <button 
                      className={`btn btn-icon ${libItem.rating === 'like' ? 'active-rating' : ''}`} 
                      onClick={(e) => { e.stopPropagation(); toggleRating(streamId, heroItem, 'like'); }}
                      style={{ color: libItem.rating === 'like' ? '#fff' : undefined }}
                    ><ThumbsUp size={20} fill={libItem.rating === 'like' ? 'white' : 'none'} /></button>
                  </>
                );
              })()}
            </div>
            
            <div className="hero-bottom-meta">
              <span className="genres">Animation • Action • Adventure</span>
            </div>
          </div>
          
          <div className="hero-right-actions" style={{zIndex: 10}}>
            <button className="btn-mute" onClick={toggleMute}>
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="age-rating">16+</div>
          </div>
        </div>
      )}

      {/* Collections Title */}
      {isCollections && (
        <div className="collections-header">
          <h1>Netflix Collections</h1>
        </div>
      )}

      {/* Rows */}
      <div className={`netflix-rows-container ${(heroItem && !isCollections) ? 'overlap-hero' : ''}`} style={{ position: 'relative', zIndex: 20 }}>
        {/* Render First Row */}
        {rowsData.slice(0, 1).map((row, index) => (
          <RowScroll 
            key={`first-${index}`} 
            title={row.title} 
            items={row.items} 
            isVertical={isCollections}
            onItemSelect={onItemSelect} 
            onExploreAll={() => {
              if (row.type && setCurrentTab) setCurrentTab(row.type);
              if (row.categoryId && onSelectCategory) onSelectCategory(row.categoryId);
              document.querySelector('.home-screen')?.scrollTo({top: 0, behavior: 'smooth'});
            }}
          />
        ))}

        {/* Render Continue Watching as Second Row */}
        {currentTab === 'home' && activeProfile?.continueWatching?.length > 0 && (
          <RowScroll 
            title="Continue Watching" 
            items={activeProfile.continueWatching.map(cw => ({...cw.item, _type: cw.item.type || cw.item._type, progress: cw.progress}))} 
            onItemSelect={onItemSelect} 
          />
        )}

        {/* Render Rest of the Rows */}
        {rowsData.slice(1, visibleRows).map((row, index) => (
          <RowScroll 
            key={`rest-${index}`} 
            title={row.title} 
            items={row.items} 
            isVertical={isCollections}
            onItemSelect={onItemSelect} 
            onExploreAll={() => {
              if (row.type && setCurrentTab) setCurrentTab(row.type);
              if (row.categoryId && onSelectCategory) onSelectCategory(row.categoryId);
              document.querySelector('.home-screen')?.scrollTo({top: 0, behavior: 'smooth'});
            }}
          />
        ))}
        
        {visibleRows < rowsData.length && (
          <div ref={observerRef} style={{ height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
}
