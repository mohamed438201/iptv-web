import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Edit2, Trash2 } from 'lucide-react';
import { PLANS } from '../services/db';
import './ProfileSelection.css';

export default function ProfileSelection() {
  const { user, selectProfile, addProfile, editProfile, removeProfile } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState('https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg');
  const [error, setError] = useState('');
  const [profileToDelete, setProfileToDelete] = useState(null);

  const AVATARS = [
    "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg",
    "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88wkdmjrorckekha.jpg",
    "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-vnl1thqhwxc13b0m.jpg",
    "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-dyrp6bw6adbulg5b.jpg"
  ];

  if (!user) return null;

  const maxProfiles = PLANS[user.planId]?.maxProfiles || 1;

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) {
      setError('Profile name cannot be empty');
      return;
    }
    try {
      await addProfile(newProfileName.trim(), newProfileAvatar);
      setIsAdding(false);
      setNewProfileName('');
      setNewProfileAvatar(AVATARS[0]);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to create profile');
    }
  };

  const handleSaveEdit = async () => {
    if (!newProfileName.trim()) {
      setError('Profile name cannot be empty');
      return;
    }
    try {
      await editProfile(editingProfileId, { name: newProfileName.trim(), avatar: newProfileAvatar });
      setEditingProfileId(null);
      setNewProfileName('');
      setNewProfileAvatar(AVATARS[0]);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to edit profile');
    }
  };

  const handleDeleteProfile = async () => {
    setProfileToDelete(editingProfileId);
  };

  const confirmDeleteProfile = async () => {
    if (!profileToDelete) return;
    try {
      await removeProfile(profileToDelete);
      if (editingProfileId === profileToDelete) {
        setEditingProfileId(null);
        setNewProfileName('');
      }
      setProfileToDelete(null);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to delete profile');
      setProfileToDelete(null);
    }
  };

  return (
    <div className="profile-selection-container">
      <div className="profile-selection-content">
        <h1>{isAdding ? 'Add Profile' : editingProfileId ? 'Edit Profile' : "Who's watching?"}</h1>
        {error && <div style={{ color: '#ef4444', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px' }}>{error}</div>}
        
        {(!isAdding && !editingProfileId) && (
          <div className="profiles-list">
            {user.profiles.map(profile => (
              <div key={profile.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div 
                  className="profile-item"
                  onClick={() => selectProfile(profile.id)}
                  style={{ marginBottom: '8px' }}
                >
                  <div className="profile-avatar" style={{ position: 'relative' }}>
                    <img src={profile.avatar} alt={profile.name} />
                  </div>
                  <span className="profile-name">{profile.name}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProfileId(profile.id);
                    setNewProfileName(profile.name);
                    setNewProfileAvatar(profile.avatar);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#a0a0b0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 8px', borderRadius: '4px' }}
                >
                  <Edit2 size={14} /> Edit
                </button>
              </div>
            ))}
            {user.profiles.length < maxProfiles && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="profile-item add-profile" onClick={() => setIsAdding(true)} style={{ marginBottom: '8px' }}>
                  <div className="profile-avatar add-icon">
                    <span>+</span>
                  </div>
                  <span className="profile-name">Add Profile</span>
                </div>
                {/* Invisible spacer to align with edit buttons */}
                <div style={{ height: '24px' }}></div>
              </div>
            )}
          </div>
        )}

        {(isAdding || editingProfileId) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginTop: '32px' }}>
            <div className="profile-avatar" style={{ transform: 'scale(1.2)', marginBottom: '16px' }}>
              <img src={newProfileAvatar} alt="Profile" />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              {AVATARS.map((avatar, idx) => (
                <div 
                  key={idx}
                  onClick={() => setNewProfileAvatar(avatar)}
                  style={{ 
                    width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer',
                    border: newProfileAvatar === avatar ? '2px solid #fff' : '2px solid transparent',
                    opacity: newProfileAvatar === avatar ? 1 : 0.5,
                    transition: 'all 0.2s'
                  }}
                >
                  <img src={avatar} alt={`Avatar option ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>

            <input 
              type="text" 
              placeholder="Profile Name" 
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              style={{ padding: '12px 24px', fontSize: '18px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: '#fff', borderRadius: '4px', outline: 'none', width: '300px', textAlign: 'center' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={isAdding ? handleAddProfile : handleSaveEdit}
                style={{ padding: '12px 32px', background: '#fff', color: '#000', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              >
                Save
              </button>
              {editingProfileId && (
                <button 
                  onClick={handleDeleteProfile}
                  style={{ padding: '12px 32px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '16px', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.5)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Trash2 size={18} /> Delete
                </button>
              )}
              <button 
                onClick={() => { setIsAdding(false); setEditingProfileId(null); setError(''); setNewProfileName(''); setNewProfileAvatar(AVATARS[0]); }}
                style={{ padding: '12px 32px', background: 'transparent', color: '#808080', fontSize: '16px', fontWeight: 'bold', border: '1px solid #808080', cursor: 'pointer', borderRadius: '4px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
