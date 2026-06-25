import React, { useState } from 'react';
import { Edit2, ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PLANS } from '../services/db';
import './Account.css';

const AVATARS = [
  'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88wkdmjrorckekha.jpg',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-dyrp6bwdf422flsk.jpg',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-vnl1thqhwxcau4dk.jpg',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-5yup5hd2i60x7ew3.jpg'
];

export default function Account({ onBack }) {
  const { user, activeProfile, logout, selectProfile, clearActiveProfile, addProfile, editProfile, removeProfile } = useAuth();
  
  const [isEditingProfiles, setIsEditingProfiles] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [profileToDelete, setProfileToDelete] = useState(null);

  if (!user || !activeProfile) return null;

  const maxProfiles = PLANS[user.planId]?.maxProfiles || 1;

  const handleSignOut = () => logout();

  const planName = PLANS[user.planId]?.name || 'Unknown Plan';

  const handleSaveProfile = async (id) => {
    if (!newProfileName.trim()) return;
    try {
      await editProfile(id, { name: newProfileName, avatar: newProfileAvatar });
      setEditingProfileId(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    try {
      await addProfile(newProfileName, newProfileAvatar);
      setEditingProfileId(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProfile = (id) => {
    if (user.profiles.length <= 1) {
      setError('You must have at least one profile.');
      return;
    }
    setProfileToDelete(id);
  };

  const confirmDeleteProfile = async () => {
    if (!profileToDelete) return;
    try {
      await removeProfile(profileToDelete);
      setError('');
      setProfileToDelete(null);
    } catch (err) {
      setError(err.message);
      setProfileToDelete(null);
    }
  };

  const startEdit = (profile) => {
    setEditingProfileId(profile.id);
    setNewProfileName(profile.name);
    setNewProfileAvatar(profile.avatar);
    setError('');
  };

  const startNew = () => {
    setEditingProfileId('new');
    setNewProfileName('');
    setNewProfileAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    setError('');
  };

  return (
    <div className="account-screen">
      <div className="account-container">
        {/* Left Sidebar */}
        <div className="account-sidebar">
          <button className="nav-row-btn transparent" onClick={onBack} style={{ marginBottom: '24px', cursor: 'pointer' }}>
            <ArrowLeft size={20} color="#fff" />
            <span style={{ color: 'white', marginLeft: '8px', fontSize: '16px' }}>Back to Home</span>
          </button>
          
          <div className="sidebar-profile-card" style={{ background: '#222', padding: '24px', borderRadius: '12px', border: 'none' }}>
            <div className="profile-avatar-wrapper" style={{ margin: '0' }}>
              <img src={activeProfile.avatar} alt="Profile" className="profile-avatar-large" style={{ borderRadius: '12px', width: '120px', height: '120px', objectFit: 'cover' }} />
              <button className="edit-avatar-btn" onClick={() => setIsEditingProfiles(true)} style={{ background: '#333', border: '1px solid #444', right: '-10px', bottom: '-10px' }}><Edit2 size={14} color="#aaa" /></button>
            </div>

            <div className="profile-name-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: 'white' }}>{activeProfile.name}</h2>
              <Edit2 size={16} color="#aaa" style={{ cursor: 'pointer' }} onClick={() => setIsEditingProfiles(true)} />
            </div>
            
            <p className="member-since" style={{ color: '#aaa', fontSize: '13px', margin: '4px 0 24px 0' }}>
              Member Since {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            <div className="stats-list" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '15px', fontWeight: 'bold' }}>
                <span style={{ color: '#e5e5e5' }}>Lists</span>
                <span style={{ color: '#e5e5e5' }}>0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '15px', fontWeight: 'bold' }}>
                <span style={{ color: '#e5e5e5' }}>Collections</span>
                <span style={{ color: '#e5e5e5' }}>0</span>
              </div>
            </div>

            <div className="stats-list" style={{ marginBottom: '24px' }}>
              <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', margin: 0 }}>Viewing Activity</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '15px', fontWeight: 'bold' }}>
                <span style={{ color: '#e5e5e5' }}>Watched Movies</span>
                <span style={{ color: '#e5e5e5' }}>{activeProfile.continueWatching?.filter(h => h.item?.type === 'vod' || h.item?.type === 'movie').length || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '15px', fontWeight: 'bold' }}>
                <span style={{ color: '#e5e5e5' }}>Watched Serials</span>
                <span style={{ color: '#e5e5e5' }}>{activeProfile.continueWatching?.filter(h => h.item?.type === 'series').length || 0}</span>
              </div>
            </div>

            <div className="sidebar-actions" style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button className="sidebar-btn btn-outline" onClick={handleSignOut} style={{ cursor: 'pointer', flex: 1, padding: '10px', fontSize: '14px', borderRadius: '8px', background: 'transparent', border: '1px solid #444', color: 'white', fontWeight: 'bold', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#333'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Sign Out</button>
              <button className="sidebar-btn btn-outline" onClick={() => clearActiveProfile()} style={{ cursor: 'pointer', flex: 1, padding: '10px', fontSize: '14px', borderRadius: '8px', background: 'transparent', border: '1px solid #444', color: 'white', fontWeight: 'bold', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#333'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>View Profile</button>
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="account-main">

          {/* Section: Account Details */}
          <div className="settings-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">Account Details</h3>
                <p className="section-subtitle">Here you can view information about your account.</p>
              </div>
            </div>

            <div className="settings-card form-grid">
              <div className="form-row">
                <span className="form-label">Email</span>
                <span className="form-value">{user.email}</span>
              </div>
              <div className="form-row">
                <span className="form-label">Plan Details</span>
                <span className="form-value" style={{ color: '#e50914', fontWeight: 'bold' }}>{planName}</span>
              </div>
            </div>
          </div>

          {/* Section: Profile Management */}
          <div className="settings-section" style={{ marginTop: '48px' }}>
            <div className="section-header">
              <div>
                <h3 className="section-title">Manage Profiles</h3>
                <p className="section-subtitle">Add, edit, or delete profiles for your account.</p>
              </div>
              <button className="edit-section-btn" onClick={() => setIsEditingProfiles(!isEditingProfiles)}>
                {isEditingProfiles ? <X size={16} /> : <Edit2 size={14} />}
              </button>
            </div>

            {error && <div className="premium-error-banner" style={{ marginTop: '16px' }}>{error}</div>}

            <div className="settings-card form-grid" style={{ marginTop: '16px' }}>
              <div className="profiles-grid">
                {user.profiles.map(p => (
                  <div key={p.id} className="manage-profile-item">
                    {editingProfileId === p.id ? (
                      <div className="profile-edit-form">
                        <div className="avatar-selector">
                          <img src={newProfileAvatar} alt="Selected" className="profile-avatar-medium" />
                          <div className="avatar-options">
                            {AVATARS.map((av, i) => (
                              <img key={i} src={av} alt={`Avatar ${i}`} className={`avatar-thumb ${newProfileAvatar === av ? 'selected' : ''}`} onClick={() => setNewProfileAvatar(av)} />
                            ))}
                          </div>
                        </div>
                        <input type="text" className="premium-input profile-name-input" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Profile Name" autoFocus />
                        <div className="profile-edit-actions">
                          <button className="icon-btn success" onClick={() => handleSaveProfile(p.id)}><Check size={16} /></button>
                          <button className="icon-btn cancel" onClick={() => setEditingProfileId(null)}><X size={16} /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="profile-info-row">
                          <img src={p.avatar} alt={p.name} className="profile-avatar-small" />
                          <span className="profile-name-text">{p.name}</span>
                          {p.id === activeProfile.id && <span className="active-badge">Active</span>}
                        </div>
                        {isEditingProfiles && (
                          <div className="profile-actions-row">
                            <button className="icon-btn edit" onClick={() => startEdit(p)}><Edit2 size={16} /></button>
                            <button className="icon-btn delete" onClick={() => handleDeleteProfile(p.id)} disabled={user.profiles.length <= 1}><Trash2 size={16} /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {editingProfileId === 'new' ? (
                  <div className="manage-profile-item new-profile-form">
                    <div className="profile-edit-form">
                      <div className="avatar-selector">
                        <img src={newProfileAvatar} alt="Selected" className="profile-avatar-medium" />
                        <div className="avatar-options">
                          {AVATARS.map((av, i) => (
                            <img key={i} src={av} alt={`Avatar ${i}`} className={`avatar-thumb ${newProfileAvatar === av ? 'selected' : ''}`} onClick={() => setNewProfileAvatar(av)} />
                          ))}
                        </div>
                      </div>
                      <input type="text" className="premium-input profile-name-input" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="New Profile Name" autoFocus />
                      <div className="profile-edit-actions">
                        <button className="icon-btn success" onClick={handleCreateProfile}><Check size={16} /></button>
                        <button className="icon-btn cancel" onClick={() => setEditingProfileId(null)}><X size={16} /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  isEditingProfiles && user.profiles.length < maxProfiles && (
                    <div className="manage-profile-item add-new-btn" onClick={startNew}>
                      <Plus size={24} color="#888" />
                      <span>Add Profile</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {profileToDelete && (
        <div className="premium-modal-overlay">
          <div className="premium-modal">
            <h3 className="modal-title">Delete Profile</h3>
            <p className="modal-message">Are you sure you want to delete this profile? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="premium-btn secondary" onClick={() => setProfileToDelete(null)}>Cancel</button>
              <button className="premium-btn danger" onClick={confirmDeleteProfile}>Delete Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
