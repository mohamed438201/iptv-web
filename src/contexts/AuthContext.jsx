import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getUserById, setPlan, addProfile as dbAddProfile, updateProfile as dbUpdateProfile, deleteProfile as dbDeleteProfile, subscribeToUser, dbToggleRating, dbToggleCollection } from '../services/db';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedUserId = localStorage.getItem('iptv_auth_user');
      const savedProfileId = localStorage.getItem('iptv_auth_profile');
      const cachedUser = localStorage.getItem('iptv_cached_user');
      
      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser);
          if (savedProfileId && parsedUser.profiles) {
            const p = parsedUser.profiles.find(prof => prof.id === savedProfileId);
            if (p) setActiveProfile(p);
          }
        } catch(e) {}
      }

      if (savedUserId) {
        try {
          const u = await getUserById(savedUserId);
          if (u) {
            setUser(u);
            localStorage.setItem('iptv_cached_user', JSON.stringify(u));
            if (savedProfileId && u.profiles) {
              const p = u.profiles.find(prof => prof.id === savedProfileId);
              if (p) setActiveProfile(p);
            }
          } else {
            // User not found in DB anymore
            setUser(null);
            setActiveProfile(null);
            localStorage.removeItem('iptv_auth_user');
            localStorage.removeItem('iptv_auth_profile');
            localStorage.removeItem('iptv_cached_user');
          }
        } catch(e) {
          console.error("Auth init error:", e);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    
    const profileIds = user.profiles ? user.profiles.map(p => p.id) : [];
    const unsubscribe = subscribeToUser(user.id, profileIds, async () => {
      // Something changed, refresh user from DB
      const u = await getUserById(user.id);
      if (u) {
        setUser(u);
        if (activeProfile) {
          const p = u.profiles.find(prof => prof.id === activeProfile.id);
          if (p) setActiveProfile(p);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.profiles?.length]); // Re-subscribe if profiles are added/removed


  const login = async (email, password) => {
    const loggedInUser = await loginUser(email, password);
    setUser(loggedInUser);
    localStorage.setItem('iptv_auth_user', loggedInUser.id);
    localStorage.setItem('iptv_cached_user', JSON.stringify(loggedInUser));
    
    if (loggedInUser.profiles && loggedInUser.profiles.length > 0) {
      setActiveProfile(loggedInUser.profiles[0]);
      localStorage.setItem('iptv_auth_profile', loggedInUser.profiles[0].id);
    }
  };

  const register = async (email, password, phone) => {
    const newUser = await registerUser(email, password, phone);
    setUser(newUser);
    localStorage.setItem('iptv_auth_user', newUser.id);
    localStorage.setItem('iptv_cached_user', JSON.stringify(newUser));
    
    if (newUser.profiles && newUser.profiles.length > 0) {
      setActiveProfile(newUser.profiles[0]);
      localStorage.setItem('iptv_auth_profile', newUser.profiles[0].id);
    }
  };

  const subscribeToPlan = async (planId, status = 'active', receiptImage = null, promoCode = null) => {
    if (!user) return;
    const updatedUser = await setPlan(user.id, planId, status, receiptImage, promoCode);
    setUser(updatedUser);
    localStorage.setItem('iptv_cached_user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    setActiveProfile(null);
    localStorage.removeItem('iptv_auth_user');
    localStorage.removeItem('iptv_auth_profile');
    localStorage.removeItem('iptv_cached_user');
  };

  const selectProfile = (profileId) => {
    if (!user) return;
    const p = user.profiles.find(prof => prof.id === profileId);
    if (p) {
      setActiveProfile(p);
      localStorage.setItem('iptv_auth_profile', p.id);
    }
  };

  const clearActiveProfile = () => {
    setActiveProfile(null);
    localStorage.removeItem('iptv_auth_profile');
  };

  const refreshUser = async () => {
    if (user) {
      const u = await getUserById(user.id);
      if (u) {
        setUser(u);
        localStorage.setItem('iptv_cached_user', JSON.stringify(u));
        if (activeProfile) {
          const p = u.profiles.find(prof => prof.id === activeProfile.id);
          if (p) setActiveProfile(p);
        }
      }
    }
  };

  const addProfile = async (name, avatar) => {
    await dbAddProfile(user.id, name, avatar);
    await refreshUser();
  };

  const editProfile = async (profileId, updates) => {
    await dbUpdateProfile(user.id, profileId, updates);
    await refreshUser();
  };

  const removeProfile = async (profileId) => {
    await dbDeleteProfile(user.id, profileId);
    if (activeProfile?.id === profileId) {
      setActiveProfile(null);
      localStorage.removeItem('iptv_auth_profile');
    }
    await refreshUser();
  };

  const toggleRating = async (streamId, item, rating) => {
    if (!activeProfile) return;
    try {
      // Optimistic update
      const newLib = [...(activeProfile.library || [])];
      const existingIdx = newLib.findIndex(l => l.stream_id === String(streamId));
      let newRating = rating;

      if (existingIdx >= 0) {
        if (newLib[existingIdx].rating === rating) newRating = null;
        newLib[existingIdx].rating = newRating;
      } else {
        newLib.push({ stream_id: String(streamId), item, rating: newRating, in_collection: false });
      }
      setActiveProfile({ ...activeProfile, library: newLib });

      await dbToggleRating(activeProfile.id, String(streamId), item, rating);
      await refreshUser();
    } catch (err) {
      console.error('Rating error:', err);
      await refreshUser(); // Revert on error
    }
  };

  const toggleCollection = async (streamId, item) => {
    if (!activeProfile) return;
    try {
      // Optimistic update
      const newLib = [...(activeProfile.library || [])];
      const existingIdx = newLib.findIndex(l => l.stream_id === String(streamId));
      let newCollectionStatus = true;

      if (existingIdx >= 0) {
        newCollectionStatus = !newLib[existingIdx].in_collection;
        newLib[existingIdx].in_collection = newCollectionStatus;
      } else {
        newLib.push({ stream_id: String(streamId), item, rating: null, in_collection: true });
      }
      setActiveProfile({ ...activeProfile, library: newLib });

      await dbToggleCollection(activeProfile.id, String(streamId), item);
      await refreshUser();
    } catch (err) {
      console.error('Collection error:', err);
      await refreshUser();
    }
  };

  const value = {
    user,
    activeProfile,
    login,
    register,
    logout,
    selectProfile,
    clearActiveProfile,
    refreshUser,
    subscribeToPlan,
    addProfile,
    editProfile,
    removeProfile,
    toggleRating,
    toggleCollection
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
