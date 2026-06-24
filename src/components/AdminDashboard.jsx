import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, Clock, LogOut, Ban, RefreshCw, X, PlayCircle, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers, approveSubscription, rejectSubscription, banUser, renewSubscription, updateUserByAdmin, PLANS, subscribeToAllUsers } from '../services/db';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('all'); // 'all' or 'pending'
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({ email: '', phone: '', password: '', planId: '' });

  useEffect(() => {
    loadUsers();
    const unsubscribe = subscribeToAllUsers(() => {
      loadUsers();
    });
    return () => unsubscribe();
  }, []);

  const loadUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const handleApprove = async (userId) => {
    await approveSubscription(userId);
    await loadUsers();
  };

  const handleReject = async (userId) => {
    await rejectSubscription(userId);
    await loadUsers();
  };

  const handleBan = async (userId) => {
    if(window.confirm('Are you sure you want to ban this user?')) {
      await banUser(userId);
      await loadUsers();
    }
  };

  const handleRenew = async (userId) => {
    if(window.confirm('Add 30 days to this subscription?')) {
      await renewSubscription(userId, 1);
      await loadUsers();
    }
  };

  const handleSaveEdit = async (userId) => {
    await updateUserByAdmin(userId, editFormData);
    setEditingUserId(null);
    await loadUsers();
  };

  const filteredUsers = tab === 'pending' 
    ? users.filter(u => u.paymentStatus === 'pending')
    : users;

  const getDaysLeft = (dateString) => {
    if (!dateString) return null;
    const end = new Date(dateString);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="premium-auth-wrapper" style={{ alignItems: 'flex-start', paddingTop: '64px', overflowY: 'auto' }}>
      <div className="premium-auth-bg-animated" style={{ filter: 'blur(20px) brightness(0.2)' }}></div>
      
      <div className="premium-auth-card" style={{ maxWidth: '1200px', width: '95%', padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ShieldCheck size={40} color="#E50914" />
            <div>
              <h1 style={{ color: '#fff', fontSize: '28px', margin: 0, fontWeight: '800' }}>Admin Dashboard</h1>
              <p style={{ color: '#a0a0b0', margin: 0 }}>Manage Subscriptions & Approvals</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="text-btn" onClick={async () => {
              const localDbStr = localStorage.getItem('iptv_premium_db');
              if (!localDbStr) return alert("No local data found");
              try {
                const localDb = JSON.parse(localDbStr);
                alert("Starting migration of " + localDb.users.length + " users...");
                
                const res = await fetch('http://localhost:5000/api/migrate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(localDb)
                });
                const data = await res.json();
                
                if (res.ok) {
                  alert("Migration complete! You can reload the page.");
                  loadUsers();
                } else {
                  throw new Error(data.error);
                }
              } catch(e) {
                console.error(e);
                alert("Migration failed. Check console: " + e.message);
              }
            }} style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}>
              Migrate Local Data
            </button>
            <button className="text-btn" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          <button 
            onClick={() => setTab('all')}
            style={{ 
              background: tab === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', color: tab === 'all' ? '#fff' : '#808090', padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
            }}>
            All Users
          </button>
          <button 
            onClick={() => setTab('pending')}
            style={{ 
              background: tab === 'pending' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', color: tab === 'pending' ? '#fff' : '#808090', padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
            Pending Approvals <span style={{ background: '#E50914', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{users.filter(u => u.paymentStatus === 'pending').length}</span>
          </button>
        </div>

        <div>
          {filteredUsers.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', padding: '48px', textAlign: 'center', borderRadius: '16px' }}>
              <p style={{ color: '#808090', fontSize: '16px', margin: 0 }}>No users found in this category.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {filteredUsers.map(u => {
                const daysLeft = getDaysLeft(u.subscriptionEndDate);
                const isExpired = u.paymentStatus === 'active' && daysLeft === 0;

                return (
                  <div key={u.id} style={{ 
                    background: 'rgba(0,0,0,0.4)', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '16px', 
                    padding: '24px',
                  }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>{u.email} {u.email === 'admin@iptv.com' && <span style={{fontSize:'12px', background:'#4ade80', color:'#000', padding:'2px 6px', borderRadius:'4px', marginLeft:'8px'}}>ADMIN</span>}</div>
                        <div style={{ color: '#a0a0b0', fontSize: '14px' }}>Phone: {u.phone || 'N/A'}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ color: '#E50914', fontSize: '13px', fontWeight: 'bold', background: 'rgba(229, 9, 20, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                            {PLANS[u.planId]?.name || u.planId || 'No Plan'}
                          </span>
                          <span style={{ 
                            fontSize: '13px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px',
                            background: u.paymentStatus === 'active' ? 'rgba(74, 222, 128, 0.1)' : u.paymentStatus === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: u.paymentStatus === 'active' ? '#4ade80' : u.paymentStatus === 'pending' ? '#f59e0b' : '#ef4444'
                          }}>
                            {u.paymentStatus?.toUpperCase() || 'INACTIVE'}
                          </span>
                          {u.paymentStatus === 'active' && (
                            <span style={{ fontSize: '13px', color: isExpired ? '#ef4444' : '#a0a0b0' }}>
                              {isExpired ? 'Expired' : (daysLeft === null ? 'No Expiry' : `${daysLeft} days left`)}
                            </span>
                          )}
                        </div>
                      </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', flex: 1, minWidth: '200px' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#808090', marginBottom: '8px' }}>Proof of Payment</p>
                          {u.receiptImage ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', marginBottom: '12px' }}>
                                <Check size={16} /> <span style={{ fontSize: '14px' }}>Receipt Uploaded</span>
                              </div>
                              <div>
                                <a href={u.receiptImage} target="_blank" rel="noreferrer" style={{ color: '#fff', fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', display: 'inline-block' }}>
                                  View Receipt Image
                                </a>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#808090' }}>
                              <span style={{ fontSize: '14px' }}>No receipt uploaded</span>
                            </div>
                          )}
                        </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <button onClick={() => {
                          setEditingUserId(u.id);
                          setEditFormData({ email: u.email, phone: u.phone || '', password: u.password, planId: u.planId || 'basic' });
                        }} className="text-btn" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Edit2 size={16} /> Edit
                        </button>
                        
                        {u.paymentStatus === 'pending' && (
                          <>
                            <button onClick={() => handleReject(u.id)} className="text-btn" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>Reject</button>
                            <button onClick={() => handleApprove(u.id)} className="premium-btn-primary" style={{ height: 'auto', padding: '8px 24px', borderRadius: '8px', boxShadow: 'none' }}>Approve</button>
                          </>
                        )}
                        
                        {(!u.paymentStatus || u.paymentStatus === 'rejected') && (
                          <button onClick={() => handleApprove(u.id)} className="premium-btn-primary" style={{ height: 'auto', padding: '8px 24px', borderRadius: '8px', boxShadow: 'none' }}>Activate Account</button>
                        )}

                        {(u.paymentStatus === 'active' || u.paymentStatus === 'banned' || isExpired) && (
                          <>
                            <button onClick={() => handleBan(u.id)} disabled={u.paymentStatus === 'banned'} style={{ padding: '8px 16px', background: u.paymentStatus === 'banned' ? 'transparent' : 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: u.paymentStatus === 'banned' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                              <Ban size={16} /> {u.paymentStatus === 'banned' ? 'Banned' : 'Ban'}
                            </button>
                            {u.paymentStatus !== 'banned' && (
                              <button onClick={() => handleRenew(u.id)} style={{ padding: '8px 16px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                <RefreshCw size={16} /> Renew (+30d)
                              </button>
                            )}
                            <button onClick={() => handleReject(u.id)} title="Revoke Access" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <X size={16} /> Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Edit Form */}
                    {editingUserId === u.id && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h4 style={{ margin: '0 0 16px 0', color: '#fff' }}>Edit User Details</h4>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <input 
                            type="email" 
                            className="premium-input" 
                            style={{ flex: 1, minWidth: '200px' }} 
                            placeholder="Email"
                            value={editFormData.email} 
                            onChange={e => setEditFormData({...editFormData, email: e.target.value})} 
                          />
                          <input 
                            type="text" 
                            className="premium-input" 
                            style={{ flex: 1, minWidth: '200px' }} 
                            placeholder="Phone"
                            value={editFormData.phone} 
                            onChange={e => setEditFormData({...editFormData, phone: e.target.value})} 
                          />
                          <input 
                            type="text" 
                            className="premium-input" 
                            style={{ flex: 1, minWidth: '200px' }} 
                            placeholder="Password"
                            value={editFormData.password} 
                            onChange={e => setEditFormData({...editFormData, password: e.target.value})} 
                          />
                          <select 
                            className="premium-input" 
                            style={{ flex: 1, minWidth: '200px', backgroundColor: '#111', color: '#fff' }}
                            value={editFormData.planId}
                            onChange={e => setEditFormData({...editFormData, planId: e.target.value})}
                          >
                            <option value="basic" style={{ background: '#1a1a24', color: '#fff' }}>Basic Plan</option>
                            <option value="sports" style={{ background: '#1a1a24', color: '#fff' }}>Sports Plan</option>
                            <option value="premium" style={{ background: '#1a1a24', color: '#fff' }}>Premium Plan</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                          <button onClick={() => handleSaveEdit(u.id)} className="premium-btn-primary" style={{ padding: '8px 24px', height: 'auto', borderRadius: '8px', boxShadow: 'none' }}>Save Changes</button>
                          <button onClick={() => setEditingUserId(null)} className="text-btn" style={{ padding: '8px 16px' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                    {/* Profiles & Watch History */}
                    {u.profiles && u.profiles.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                        <h4 style={{ color: '#808090', margin: '0 0 16px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Profiles & Watch History</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                          {u.profiles.map(p => (
                            <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <img src={p.avatar} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                <div style={{ color: '#fff', fontWeight: 'bold' }}>{p.name}</div>
                              </div>
                              {p.continueWatching && p.continueWatching.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                                  {p.continueWatching.map((w, idx) => {
                                    const itemName = w.item.name || w.item.title || w.item.series_name || 'Unknown Video';
                                    const itemId = w.item.id || w.item.stream_id || w.item.series_id || idx;
                                    return (
                                      <div key={itemId} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                                        <PlayCircle size={14} color="#E50914" style={{ flexShrink: 0 }} />
                                        <span style={{ color: '#ccc', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={itemName}>
                                          {itemName} <span style={{ color: '#808090' }}>({Math.round(w.percentage || 0)}%)</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>No watch history yet.</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
