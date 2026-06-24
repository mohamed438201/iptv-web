import React from 'react';
import { Play, Plus } from 'lucide-react';
import './Cards.css';

export function UniversalCard({ item, onClick }) {
  const fallbackName = encodeURIComponent(item.name || 'TV');
  const fallbackImage = `https://ui-avatars.com/api/?name=${fallbackName}&background=111111&color=ffffff&size=512&font-size=0.3`;
  const imageSrc = item.stream_icon || item.cover || fallbackImage;
  const year = item.year || item.added?.substring(0,4) || '2023';
  const match = Math.floor(Math.random() * 15 + 85); // Fake match %
  const ratingText = item.rating ? `${item.rating} • ` : '';

  return (
    <div className="netflix-universal-card" onClick={() => onClick(item)}>
      <div className="u-card-image-wrapper">
        <img src={imageSrc} alt={item.name} loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/250x350/111111/FFFFFF?text=No+Image' }} />
      </div>
      <div className="u-card-body">
        <div className="u-card-header">
          <h3 className="u-card-title">{item.name}</h3>
          <button className="u-card-add-btn" onClick={(e) => { e.stopPropagation(); /* Add to list */ }}>
            <Plus size={14} />
          </button>
        </div>
        <div className="u-card-meta">
          <span className="year">{year}</span>
          <span className="dot">•</span>
          <span className="extra">{ratingText}2h 10m</span>
          <span className="dot">•</span>
          <span className="match">{match}% match</span>
        </div>
        <p className="u-card-desc">
          {item.plot || item.description || "Explore this amazing content with high quality streaming. The perfect blend of action and story."}
        </p>
        <div className="u-card-genres">
          Action • Adventure • Sci-Fi
        </div>
      </div>
    </div>
  );
}
