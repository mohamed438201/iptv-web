import React, { useState, useEffect } from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  onSearchClick,
  liveCategories,
  vodCategories,
  seriesCategories,
  setCurrentCategoryId,
  onProfileClick
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const { activeProfile, user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      const mainContent = document.querySelector('.home-screen');
      if (mainContent && mainContent.scrollTop > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    const mainContent = document.querySelector('.home-screen');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (mainContent) mainContent.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleCategorySelect = (tab, catId) => {
    setCurrentTab(tab);
    setCurrentCategoryId(catId);
    setHoveredMenu(null);
  };

  const renderMegaMenu = (tab, categories) => {
    if (!categories || categories.length === 0) return null;
    
    // Sort and slice top 30 categories to avoid massive menus
    const displayCats = categories.slice(0, 30);
    
    return (
      <div className="mega-menu">
        <div className="mega-menu-grid">
          {displayCats.map(cat => (
            <div 
              key={cat.category_id} 
              className="mega-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleCategorySelect(tab, cat.category_id);
              }}
            >
              {cat.category_name}
            </div>
          ))}
        </div>
        {categories.length > 30 && (
          <div 
            className="mega-menu-more"
            onClick={(e) => {
              e.stopPropagation();
              handleCategorySelect(tab, 'all');
            }}
          >
            View All Categories...
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={`netflix-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-left">
        <h1 className="netflix-logo" onClick={() => handleCategorySelect('home', 'all')}>IPTV PREMIUM</h1>
        <ul className="navbar-links">
          <li className={currentTab === 'home' ? 'active' : ''} onClick={() => handleCategorySelect('home', 'all')}>Home</li>
          
          {user?.planId !== 'sports' && (
            <li 
              className={`has-dropdown ${currentTab === 'series' ? 'active' : ''}`} 
              onMouseEnter={() => setHoveredMenu('series')}
              onMouseLeave={() => setHoveredMenu(null)}
              onClick={() => handleCategorySelect('series', 'all')}
            >
              TV Shows
              {hoveredMenu === 'series' && renderMegaMenu('series', seriesCategories)}
            </li>
          )}
          
          {user?.planId !== 'sports' && (
            <li 
              className={`has-dropdown ${currentTab === 'vod' ? 'active' : ''}`}
              onMouseEnter={() => setHoveredMenu('vod')}
              onMouseLeave={() => setHoveredMenu(null)}
              onClick={() => handleCategorySelect('vod', 'all')}
            >
              Movies
              {hoveredMenu === 'vod' && renderMegaMenu('vod', vodCategories)}
            </li>
          )}
          
          {user?.planId !== 'basic' && (
            <li 
              className={`has-dropdown ${currentTab === 'live' ? 'active' : ''}`}
              onMouseEnter={() => setHoveredMenu('live')}
              onMouseLeave={() => setHoveredMenu(null)}
              onClick={() => handleCategorySelect('live', 'all')}
            >
              Live TV
              {hoveredMenu === 'live' && renderMegaMenu('live', liveCategories)}
            </li>
          )}
          
          <li>My list</li>
          <li className={currentTab === 'collections' ? 'active' : ''} onClick={() => handleCategorySelect('collections', 'all')}>Collections</li>
        </ul>
      </div>
      <div className="navbar-right">
        <div className="search-trigger" onClick={onSearchClick}>
          <Search size={24} className="icon" style={{color: '#fff', strokeWidth: 2}}/>
        </div>
        <Bell size={24} className="icon" style={{color: '#fff', strokeWidth: 2}}/>
        <div className="profile-icon" onClick={onProfileClick} style={{cursor: 'pointer'}}>
          <img src={activeProfile?.avatar || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"} alt="Profile" style={{borderRadius: '4px'}}/>
        </div>
      </div>
    </nav>
  );
}
