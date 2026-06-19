import React from 'react';
import { Tv, Search, X } from 'lucide-react';

export default function Sidebar({ groups, currentGroup, onSelectGroup, onSearch, isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header-mobile">
          <div className="logo-area">
            <Tv size={28} className="logo-icon" />
            <h1>Premium TV</h1>
          </div>
          <button className="close-btn mobile-only" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="ابحث عن قناة..." 
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        <div className="groups-container">
          <h3>الباقات والمجموعات</h3>
          <ul className="groups-list">
            {Object.keys(groups).length === 0 ? (
              <li className="empty-state">لا توجد مجموعات</li>
            ) : (
              <>
                <li 
                  className={currentGroup === 'All' ? 'active' : ''}
                  onClick={() => { onSelectGroup('All'); onClose(); }}
                >
                  <span>جميع القنوات</span>
                  <span className="group-count">
                    {Object.values(groups).reduce((acc, curr) => acc + curr.length, 0)}
                  </span>
                </li>
                {Object.keys(groups).sort().map(group => (
                  <li 
                    key={group}
                    className={currentGroup === group ? 'active' : ''}
                    onClick={() => { onSelectGroup(group); onClose(); }}
                  >
                    <span title={group}>
                      {group.length > 25 ? group.substring(0, 25) + '...' : group}
                    </span>
                    <span className="group-count">{groups[group].length}</span>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      </aside>
    </>
  );
}
