import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getUserById, setPlan, addProfile as dbAddProfile, updateProfile as dbUpdateProfile, deleteProfile as dbDeleteProfile, subscribeToUser } from '../services/db';

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
      if (savedUserId) {
        try {
          const u = await getUserById(savedUserId);
          if (u) {
            setUser(u);
            if (savedProfileId && u.profiles) {
              const p = u.profiles.find(prof => prof.id === savedProfileId);
              if (p) setActiveProfile(p);
            }
          } else {
            // User not found in DB anymore
            localStorage.removeItem('iptv_auth_user');
            localStorage.removeItem('iptv_auth_profile');
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
  };

  const register = async (email, password, phone) => {
    const newUser = await registerUser(email, password, phone);
    setUser(newUser);
    localStorage.setItem('iptv_auth_user', newUser.id);
  };

  const subscribeToPlan = async (planId, status = 'active', receiptImage = null, promoCode = null) => {
    if (!user) return;
    const updatedUser = await setPlan(user.id, planId, status, receiptImage, promoCode);
    setUser(updatedUser);
  };

  const logout = () => {
    setUser(null);
    setActiveProfile(null);
    localStorage.removeItem('iptv_auth_user');
    localStorage.removeItem('iptv_auth_profile');
  };

  const selectProfile = (profileId) => {
    if (!user) return;
    const p = user.profiles.find(prof => prof.id === profileId);
    if (p) {
      setActiveProfile(p);
      localStorage.setItem('iptv_auth_profile', p.id);
    }
  };

  const refreshUser = async () => {
    if (user) {
      const u = await getUserById(user.id);
      if (u) {
        setUser(u);
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

  const value = {
    user,
    activeProfile,
    login,
    register,
    logout,
    selectProfile,
    refreshUser,
    subscribeToPlan,
    addProfile,
    editProfile,
    removeProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
