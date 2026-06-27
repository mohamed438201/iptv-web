export const PLANS = {
  basic: { id: 'basic', name: 'Basic', price: '$5/mo', maxProfiles: 1, maxDevices: 1, features: ['Movies Only', 'SD Quality', '1 Profile', 'Continue Watching'] },
  sports: { id: 'sports', name: 'Sports Pass', price: '$10/mo', maxProfiles: 2, maxDevices: 2, features: ['Live TV (Sports)', 'HD Quality', '2 Profiles', 'Continue Watching'] },
  premium: { id: 'premium', name: 'Premium', price: '$15/mo', maxProfiles: 4, maxDevices: 4, features: ['All Content', '4K Quality', '4 Profiles', 'Continue Watching'] }
};

const API_URL = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('iptv_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const loginUser = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem('iptv_auth_token', data.token);
  return getUserById(data.id);
};

export const registerUser = async (email, password, phone) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, phone })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  localStorage.setItem('iptv_auth_token', data.token);
  return getUserById(data.id);
};

export const getUserById = async (userId) => {
  const res = await fetch(`${API_URL}/users/${userId}`, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return await res.json();
};

export const getAllUsers = async () => {
  const res = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return await res.json();
};

export const approveSubscription = async (userId) => {
  const newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      payment_status: 'active',
      subscription_end_date: newEnd.toISOString()
    })
  });
};

export const rejectSubscription = async (userId) => {
  await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ payment_status: null, plan_id: null })
  });
};

export const banUser = async (userId) => {
  await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ payment_status: 'banned' })
  });
};

export const renewSubscription = async (userId) => {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  
  const currentEnd = new Date(user.subscription_end_date || Date.now());
  const newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ subscription_end_date: newEnd.toISOString() })
  });
};

export const updateUserByAdmin = async (userId, updates) => {
  const dbUpdates = { ...updates };
  if (dbUpdates.planId !== undefined) {
    dbUpdates.plan_id = dbUpdates.planId;
    delete dbUpdates.planId;
  }
  
  await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(dbUpdates)
  });
};

export const setPlan = async (userId, planId, paymentStatus, receiptImage = null, promoCode = null) => {
  const updates = {
    plan_id: planId,
    payment_status: paymentStatus
  };
  
  if (paymentStatus === 'active') {
    updates.subscription_end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  
  if (receiptImage) updates.receipt_image = receiptImage;
  if (promoCode) updates.promo_code = promoCode;
  
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to set plan (Status: ${res.status})`);
  }
  
  return getUserById(userId);
};

export const verifyPromoCode = async (code) => {
  const res = await fetch(`${API_URL}/promo/verify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid promo code');
  return data;
};

export const addProfile = async (userId, name, avatar) => {
  await fetch(`${API_URL}/profiles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ user_id: userId, name, avatar })
  });
};

export const updateProfile = async (userId, profileId, updates) => {
  await fetch(`${API_URL}/profiles/${profileId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
};

export const deleteProfile = async (userId, profileId) => {
  await fetch(`${API_URL}/profiles/${profileId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
};

export const saveContinueWatching = async (userId, profileId, item, progress, duration) => {
  if (item.type === 'live' || item._type === 'live' || item.stream_type === 'live') return;

  const streamId = String(item.series_id || item.stream_id || item.id);
  
  let percentage = 0;
  if (duration && duration > 0) {
    percentage = (progress / duration) * 100;
  }

  await fetch(`${API_URL}/watch-history`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      profile_id: profileId,
      stream_id: streamId,
      item: item,
      progress: progress,
      duration: duration,
      percentage: percentage
    })
  });
};

// No real-time implementation for polling yet. We provide dummy subscribe methods
// to prevent AdminDashboard and AuthContext from crashing.
export const subscribeToAllUsers = (callback) => {
  // To avoid constant polling during development, we'll just return a dummy unsubscribe.
  // In a production app, you'd use WebSockets (Socket.io) here.
  return () => {};
};

export const subscribeToUser = (userId, profileIds = [], callback) => {
  return () => {};
};

export const dbToggleRating = async (profileId, streamId, item, rating) => {
  const res = await fetch(`${API_URL}/library/toggle-rating`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ profile_id: profileId, stream_id: streamId, item, rating })
  });
  if (!res.ok) throw new Error('Failed to toggle rating');
  return await res.json();
};

export const dbToggleCollection = async (profileId, streamId, item) => {
  const res = await fetch(`${API_URL}/library/toggle-collection`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ profile_id: profileId, stream_id: streamId, item })
  });
  if (!res.ok) throw new Error('Failed to toggle collection');
  return await res.json();
};
