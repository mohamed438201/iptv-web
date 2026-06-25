import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UniversalCard } from './Cards';
import { HeartCrack } from 'lucide-react';
import './LibraryPages.css';

export default function MyList({ onItemSelect }) {
  const { activeProfile } = useAuth();
  
  const likedItems = activeProfile?.library?.filter(l => l.rating === 'like').map(l => l.item) || [];

  return (
    <div className="library-page-container">
      <div className="library-header">
        <h1>My List</h1>
        <p>Movies and TV shows you have liked.</p>
      </div>
      
      {likedItems.length > 0 ? (
        <div className="library-grid">
          {likedItems.map((item, idx) => (
            <UniversalCard key={idx} item={item} onClick={(clickedItem) => onItemSelect(clickedItem, clickedItem._type || clickedItem.type)} />
          ))}
        </div>
      ) : (
        <div className="library-empty-state">
          <HeartCrack size={64} className="library-empty-icon" />
          <h2>Your list is empty</h2>
          <p>When you like a movie or TV show, it will appear here so you can easily find it later.</p>
        </div>
      )}
    </div>
  );
}
