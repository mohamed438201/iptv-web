import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import './AdvancedSearch.css';

export default function AdvancedSearch({ 
  liveStreams, 
  vodStreams, 
  seriesStreams, 
  onClose, 
  onItemSelect 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ live: [], vod: [], series: [] });
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) inputRef.current.focus();
    
    // Prevent body scroll when search is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ live: [], vod: [], series: [] });
      return;
    }

    const q = query.toLowerCase();
    
    const filterStreams = (streams) => {
      if (!streams) return [];
      return streams.filter(s => s.name && s.name.toLowerCase().includes(q)).slice(0, 18);
    };

    setResults({
      live: filterStreams(liveStreams),
      vod: filterStreams(vodStreams),
      series: filterStreams(seriesStreams)
    });
  }, [query, liveStreams, vodStreams, seriesStreams]);

  return (
    <div className="advanced-search-overlay">
      <button className="close-search-btn" onClick={onClose}>
        <X size={40} />
      </button>

      <div className="search-header">
        <div className="search-input-wrapper">
          <Search size={48} className="search-icon-large" />
          <input 
            ref={inputRef}
            type="text" 
            className="huge-search-input" 
            placeholder="Search for movies, TV shows, channels..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="search-results-container">
        {query.trim().length >= 2 && (
          <>
            {results.vod.length > 0 && (
              <div className="search-section">
                <h2>Movies</h2>
                <div className="search-grid">
                  {results.vod.map(item => (
                    <div key={item.stream_id} className="search-card" onClick={() => onItemSelect(item, 'vod')}>
                      <img src={item.stream_icon || item.cover || 'https://placehold.co/320x180/111/fff?text=No+Image'} alt={item.name} />
                      <div className="search-card-overlay">
                        <span className="search-card-title">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.series.length > 0 && (
              <div className="search-section">
                <h2>TV Shows</h2>
                <div className="search-grid">
                  {results.series.map(item => (
                    <div key={item.series_id} className="search-card" onClick={() => onItemSelect(item, 'series')}>
                      <img src={item.cover || 'https://placehold.co/320x180/111/fff?text=No+Image'} alt={item.name} />
                      <div className="search-card-overlay">
                        <span className="search-card-title">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.live.length > 0 && (
              <div className="search-section">
                <h2>Live TV</h2>
                <div className="search-grid">
                  {results.live.map(item => (
                    <div key={item.stream_id} className="search-card" onClick={() => onItemSelect(item, 'live')}>
                      <img src={item.stream_icon || 'https://placehold.co/320x180/111/fff?text=No+Image'} alt={item.name} style={{ objectFit: 'contain', background: '#000' }} />
                      <div className="search-card-overlay">
                        <span className="search-card-title">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.live.length === 0 && results.vod.length === 0 && results.series.length === 0 && (
              <div className="no-results">
                <p>No results found for "{query}"</p>
                <span>Try exploring other titles or genres.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
