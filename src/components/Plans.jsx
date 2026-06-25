import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PLANS, verifyPromoCode } from '../services/db';
import { Check, X, ArrowRight, ShieldCheck, Upload } from 'lucide-react';
import './Auth.css';

export default function Plans() {
  const { subscribeToPlan, logout } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [coupon, setCoupon] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('plans'); // 'plans' or 'checkout'
  const [receipt, setReceipt] = useState(null);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    try {
      const data = await verifyPromoCode(coupon.trim());
      if (data.discount === 100) {
        setDiscountApplied(true);
        setError('');
      } else {
        setError(`Coupon gives ${data.discount}% discount, but 100% is required for instant activation.`);
        setDiscountApplied(false);
      }
    } catch (err) {
      setError(err.message);
      setDiscountApplied(false);
    }
  };

  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribeClick = async () => {
    if (discountApplied) {
      setIsSubscribing(true);
      setError('');
      try {
        await subscribeToPlan(selectedPlan, 'active', null, coupon.trim());
      } catch (err) {
        setError(err.message);
      } finally {
        setIsSubscribing(false);
      }
    } else {
      setStep('checkout');
    }
  };

  const handleConfirmPayment = () => {
    if (!receipt) {
      setError('Please upload a screenshot of your transfer receipt.');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      subscribeToPlan(selectedPlan, 'pending', base64String);
    };
    reader.readAsDataURL(receipt);
  };

  if (step === 'checkout') {
    const plan = PLANS[selectedPlan];
    return (
      <div className="premium-auth-wrapper">
        <div className="premium-auth-bg-animated"></div>
        <div className="premium-auth-card" style={{ maxWidth: '560px', padding: '40px' }}>
          <div className="premium-auth-header" style={{ marginBottom: '24px' }}>
            <ShieldCheck size={48} color="#E50914" style={{ marginBottom: '16px' }} />
            <h2>Complete Your Payment</h2>
            <p>You have selected the <strong style={{ color: '#fff' }}>{plan.name}</strong> plan for {plan.price}.</p>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Vodafone_Cash.png/1200px-Vodafone_Cash.png" alt="Vodafone Cash" style={{ height: '32px', marginBottom: '16px', objectFit: 'contain' }} />
            <h3 style={{ marginBottom: '8px', fontSize: '18px', color: '#fff' }}>Transfer Instructions</h3>
            <p style={{ fontSize: '14px', color: '#a0a0b0', lineHeight: '1.6' }}>
              Please transfer the subscription amount to the following Vodafone Cash or InstaPay number:
            </p>
            <div style={{ 
              background: 'rgba(229, 9, 20, 0.1)', 
              padding: '16px', 
              margin: '16px 0', 
              borderRadius: '12px', 
              fontSize: '28px', 
              fontWeight: '800', 
              color: '#E50914',
              letterSpacing: '2px',
              textAlign: 'center',
              border: '1px dashed rgba(229, 9, 20, 0.3)'
            }}>
              01112338271
            </div>
            <p style={{ fontSize: '14px', color: '#a0a0b0', textAlign: 'center' }}>
              Account Name: <strong style={{ color: '#fff' }}>test</strong>
            </p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            {error && <div className="premium-error-banner">{error}</div>}
            <label style={{ display: 'block', marginBottom: '12px', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Upload Transfer Receipt</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => { setReceipt(e.target.files[0]); setError(''); }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
              />
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'center', transition: 'all 0.3s' }}>
                <Upload size={32} color={receipt ? '#4ade80' : '#808090'} style={{ marginBottom: '12px' }} />
                <p style={{ color: receipt ? '#4ade80' : '#808090', fontWeight: '600', margin: 0 }}>
                  {receipt ? receipt.name : 'Click to upload screenshot'}
                </p>
              </div>
            </div>
          </div>

          <button onClick={handleConfirmPayment} className="premium-btn-primary" style={{ width: '100%', marginBottom: '16px' }}>
            <span>Confirm Payment</span>
            <ArrowRight size={20} />
          </button>
          
          <button onClick={() => setStep('plans')} className="text-btn" style={{ width: '100%' }}>
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  // Feature list for comparison
  const allFeatures = [
    { key: 'content', label: 'Content Access' },
    { key: 'quality', label: 'Video Quality' },
    { key: 'profiles', label: 'Max Profiles' },
    { key: 'continue', label: 'Continue Watching' },
  ];

  const planMatrix = {
    basic: { content: 'Movies Only', quality: 'SD (480p)', profiles: '1 Profile', continue: true },
    sports: { content: 'Live TV + Sports', quality: 'HD (1080p)', profiles: '2 Profiles', continue: true },
    premium: { content: 'Everything + Live TV', quality: '4K + HDR', profiles: '4 Profiles', continue: true }
  };

  return (
    <div className="premium-auth-wrapper" style={{ overflowY: 'auto' }}>
      <div className="premium-auth-bg-animated"></div>
      
      <div className="premium-auth-card" style={{ maxWidth: '900px', width: '90%', margin: '40px 0', padding: '48px' }}>
        <div className="premium-auth-header" style={{ marginBottom: '48px', position: 'relative' }}>
          <button 
            onClick={() => logout()} 
            style={{ position: 'absolute', top: '-10px', right: 0, background: 'transparent', color: '#a0a0b0', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.target.style.color = '#fff'; e.target.style.borderColor = '#fff'; }}
            onMouseLeave={(e) => { e.target.style.color = '#a0a0b0'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          >
            Sign Out
          </button>
          <h2>Choose the perfect plan</h2>
          <p>Downgrade or upgrade at any time. No commitments.</p>
        </div>
        
        {error && <div className="premium-error-banner">{error}</div>}
        
        {/* Modern Comparison Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {Object.values(PLANS).map(plan => (
            <div 
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              style={{
                position: 'relative',
                background: selectedPlan === plan.id ? 'rgba(229, 9, 20, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `2px solid ${selectedPlan === plan.id ? '#E50914' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '20px',
                padding: '32px 24px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: selectedPlan === plan.id ? 'scale(1.02)' : 'scale(1)',
                boxShadow: selectedPlan === plan.id ? '0 20px 40px rgba(229, 9, 20, 0.2)' : 'none',
              }}
            >
              {selectedPlan === plan.id && (
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#E50914', color: '#fff', padding: '4px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  SELECTED
                </div>
              )}
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '8px', textAlign: 'center' }}>{plan.name}</h3>
              
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                {discountApplied ? (
                  <>
                    <div style={{ textDecoration: 'line-through', color: '#808090', fontSize: '16px' }}>{plan.price}</div>
                    <div style={{ color: '#4ade80', fontWeight: '800', fontSize: '24px' }}>FREE</div>
                  </>
                ) : (
                  <div style={{ color: '#fff', fontWeight: '800', fontSize: '28px' }}>{plan.price}</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {allFeatures.map(f => {
                  const val = planMatrix[plan.id][f.key];
                  const isYes = val === true;
                  const isNo = val === false;
                  return (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                      {isNo ? <X size={18} color="#ef4444" /> : <Check size={18} color="#E50914" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#808090', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</div>
                        <div style={{ fontSize: '15px', color: isNo ? '#666' : '#fff', fontWeight: '600' }}>
                          {isYes ? 'Included' : (isNo ? 'Not included' : val)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
          <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="Have a coupon code?" 
              value={coupon}
              onChange={(e) => { setCoupon(e.target.value); setError(''); }}
              style={{ flex: 1, paddingLeft: '20px' }}
            />
            <button type="submit" className="premium-btn-primary" style={{ width: '120px', background: '#333', border: 'none', boxShadow: 'none' }}>
              Apply
            </button>
          </form>
          {discountApplied && <div style={{ color: '#4ade80', marginTop: '12px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} /> Coupon '{coupon}' applied successfully!</div>}
        </div>

        <button onClick={handleSubscribeClick} disabled={isSubscribing} className="premium-btn-primary" style={{ width: '100%', height: '64px', fontSize: '20px', opacity: isSubscribing ? 0.7 : 1 }}>
          <span>{isSubscribing ? 'Processing...' : (discountApplied ? 'Activate Instantly' : 'Subscribe Now')}</span>
          {!isSubscribing && <ArrowRight size={24} />}
        </button>
      </div>
    </div>
  );
}
