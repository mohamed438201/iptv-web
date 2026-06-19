import React from 'react';
import { Play, Bookmark, Download, Share } from 'lucide-react';

export default function ChannelDetail({ channel, groupChannels, onBack, onPlay, onSelectRelated }) {
  if (!channel || !channel.name) return null;

  const relatedChannels = (groupChannels || [])
    .filter(c => c && c.name && c.name !== channel.name)
    .slice(0, 15);

  const channelImageSrc = channel.logo || `https://placehold.co/256x256/111111/FFFFFF?text=TV`;

  const handleImageError = (e) => {
    if (e.target.dataset.error) return;
    e.target.dataset.error = true;
    e.target.src = 'https://placehold.co/256x256/111111/FFFFFF?text=TV';
  };

  return (
    <div className="detail-screen">
      <button className="back-btn" onClick={onBack}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="back-btn-icon">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-hero">
            <div className="detail-bg">
              <img src={channelImageSrc} alt="bg" onError={handleImageError} />
            </div>
            <div className="detail-gradient"></div>

            <div className="detail-content">
              <img 
                src={channelImageSrc} 
                alt="Logo" 
                className="detail-logo" 
                style={{ borderRadius: channel.logo ? '0' : '50%' }}
                onError={handleImageError} 
              />
              {!channel.logo && <h2 className="detail-title">{channel.name}</h2>}
              <p className="detail-meta">{channel.group || 'بث مباشر'} • قناة</p>

              <button className="play-main-btn" onClick={() => onPlay(channel)}>
                <Play fill="black" size={20} />
                تشغيل القناة
              </button>
            </div>
          </div>

          <div className="action-buttons">
            <button className="action-btn">
              <Bookmark size={20} />
              <span>أضف للقائمة</span>
            </button>
            <div className="action-divider"></div>
            <button className="action-btn">
              <Download size={20} />
              <span>تنزيل</span>
            </button>
            <div className="action-divider"></div>
            <button className="action-btn">
              <Share size={20} />
              <span>مشاركة</span>
            </button>
          </div>

          <div className="detail-description">
            شاهد البث المباشر لقناة {channel.name}. استمتع بمشاهدة برامجك المفضلة بجودة عالية وبدون تقطيع.
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="detail-tabs-container">
            <div className="detail-tab-active">
              قنوات ذات صلة
            </div>
          </div>

          <div className="related-channels-list">
            {relatedChannels.map((relChannel, idx) => {
              const relImageSrc = relChannel.logo || `https://placehold.co/256x256/111111/FFFFFF?text=TV`;
              return (
                <div 
                  key={idx} 
                  onClick={() => onSelectRelated(relChannel)}
                  className="related-channel-item"
                >
                  <div className="related-channel-img-wrapper">
                    <img 
                      src={relImageSrc} 
                      alt={relChannel.name} 
                      className="related-channel-img"
                      onError={handleImageError} 
                    />
                    <div className="related-channel-play-overlay">
                      <Play fill="white" size={24} />
                    </div>
                  </div>
                  
                  <div className="related-channel-info">
                    <h4 className="related-channel-title">{idx + 1}. {relChannel.name}</h4>
                    <span className="related-channel-subtitle">بث مباشر</span>
                  </div>
                  
                  <button className="related-channel-action">
                     <Download size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
