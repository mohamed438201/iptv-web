import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, ArrowRight, Phone } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './Auth.css';

export default function Register({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const validatePassword = (pwd) => {
    // 8 chars, 1 number, 1 special char, 1 lowercase, 1 uppercase
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !phone) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      await register(email, password, phone);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="premium-auth-wrapper">
      <div className="premium-auth-bg-animated"></div>
      
      <div className="premium-auth-card" style={{ maxWidth: '520px' }}>
        <div className="premium-auth-header">
          <div className="premium-logo">
            <span className="logo-icon">▶</span>
            <span className="logo-text">IPTV <span className="highlight">PREMIUM</span></span>
          </div>
          <h2>Create Account</h2>
          <p>Join us today and unlock a universe of entertainment.</p>
        </div>

        {error && <div className="premium-error-banner">{error}</div>}

        <form className="premium-auth-form" onSubmit={handleSubmit}>
          <div className="premium-input-group">
            <div className="input-icon-wrapper">
              <Mail size={20} className="input-icon" />
            </div>
            <input 
              type="email" 
              className="premium-input" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="premium-input-group phone-input-wrapper">
            <PhoneInput
              international
              defaultCountry="SA"
              value={phone}
              onChange={(val) => { setPhone(val); setError(''); }}
              className="premium-phone-input"
              placeholder="Phone number"
              required
            />
          </div>

          <div className="premium-input-group">
            <div className="input-icon-wrapper">
              <Lock size={20} className="input-icon" />
            </div>
            <input 
              type="password" 
              className="premium-input" 
              placeholder="Create a password" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
              minLength={8}
            />
          </div>

          <div className="premium-input-group">
            <div className="input-icon-wrapper">
              <Lock size={20} className="input-icon" />
            </div>
            <input 
              type="password" 
              className="premium-input" 
              placeholder="Confirm password" 
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              required
            />
          </div>

          <button type="submit" className={`premium-btn-primary ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            <span>{isLoading ? 'Creating Account...' : 'Sign Up'}</span>
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="premium-auth-footer">
          Already have an account?{' '}
          <button className="text-btn" onClick={() => onNavigate('login')}>
            Sign in instead
          </button>
        </div>
      </div>
    </div>
  );
}
