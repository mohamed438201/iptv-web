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
  const { user, activeProfile, logout, selectProfile, addProfile, editProfile, removeProfile } = useAuth();
  
  const [isEditingProfiles, setIsEditingProfiles] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');

  if (!user || !activeProfile) return null;

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

  const handleDeleteProfile = async (id) => {
    if (user.profiles.length <= 1) {
      setError('You must have at least one profile.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this profile?')) {
      try {
        await removeProfile(id);
        setError('');
      } catch (err) {
        setError(err.message);
      }
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
          
          <div className="sidebar-profile-card">
            <div className="profile-avatar-wrapper">
              <img src={activeProfile.avatar} alt="Profile" className="profile-avatar-large" />
              <button className="edit-avatar-btn" onClick={() => setIsEditingProfiles(true)}><Edit2 size={14} /></button>
            </div>

            <div className="profile-name-row">
              <h2>{activeProfile.name}</h2>
            </div>
            <p className="member-since">Subscriber since {new Date().getFullYear()}</p>

            <div className="sidebar-actions">
              <button className="sidebar-btn btn-outline" onClick={handleSignOut} style={{ cursor: 'pointer' }}>Sign Out</button>
              <button className="sidebar-btn btn-outline" onClick={() => selectProfile(null)} style={{ cursor: 'pointer' }}>Switch Profile</button>
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
                  isEditingProfiles && user.profiles.length < 4 && (
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
    </div>
  );
}
