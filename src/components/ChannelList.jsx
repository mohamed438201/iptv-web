import React from 'react';
import { ListX } from 'lucide-react';

export default function ChannelList({ channels, categoryTitle, currentChannel, onPlay }) {
  return (
    <section className="channels-section glass-panel">
      <div className="section-header">
        <h3>{categoryTitle}</h3>
        <span className="channels-count">{channels.length} قناة</span>
      </div>
      
      <div className="channels-grid">
        {channels.length === 0 ? (
          <div className="empty-state-channels">
            <ListX size={48} style={{ opacity: 0.5 }} />
            <p>لا توجد قنوات لعرضها</p>
          </div>
        ) : (
          channels.map((channel, index) => {
            const isPlaying = currentChannel && currentChannel.url === channel.url;
            return (
              <div 
                key={index} 
                className={`channel-card ${isPlaying ? 'playing' : ''}`}
                onClick={() => onPlay(channel)}
              >
                {channel.logo ? (
                  <img 
                    src={channel.logo} 
                    className="card-logo" 
                    alt={channel.name} 
                    onError={(e) => { 
                      e.target.style.display = 'none'; 
                      e.target.nextElementSibling.classList.remove('hidden'); 
                    }}
                  />
                ) : null}
                <div className={`card-logo-placeholder ${channel.logo ? 'hidden' : ''}`}>
                  {channel.name.charAt(0)}
                </div>
                
                <div className="card-info">
                  <div className="card-title" title={channel.name}>{channel.name}</div>
                  <div className="card-group" title={channel.group}>{channel.group}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
