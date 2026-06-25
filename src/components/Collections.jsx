import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UniversalCard } from './Cards';
import { FolderOpen } from 'lucide-react';
import './LibraryPages.css';

export default function Collections({ onItemSelect }) {
  const { activeProfile } = useAuth();
  
  const collectionItems = activeProfile?.library?.filter(l => l.in_collection).map(l => l.item) || [];

  return (
    <div className="library-page-container">
      <div className="library-header">
        <h1>My Collection</h1>
        <p>Your curated selection of movies and TV shows.</p>
      </div>
      
      {collectionItems.length > 0 ? (
        <div className="library-grid">
          {collectionItems.map((item, idx) => (
            <UniversalCard key={idx} item={item} onClick={(clickedItem) => onItemSelect(clickedItem, clickedItem._type || clickedItem.type)} />
          ))}
        </div>
      ) : (
        <div className="library-empty-state">
          <FolderOpen size={64} className="library-empty-icon" />
          <h2>Your collection is empty</h2>
          <p>Add movies and TV shows to your collection by clicking the plus icon on any title.</p>
        </div>
      )}
    </div>
  );
}
