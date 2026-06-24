import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import './Auth.css';

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    try {
      // Simulate network delay for premium feel
      await new Promise(resolve => setTimeout(resolve, 800));
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="premium-auth-wrapper">
      <div className="premium-auth-bg-animated"></div>
      
      <div className="premium-auth-card">
        <div className="premium-auth-header">
          <div className="premium-logo">
            <span className="logo-icon">▶</span>
            <span className="logo-text">IPTV <span className="highlight">PREMIUM</span></span>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue your streaming journey.</p>
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
            />
          </div>

          <div className="premium-input-group">
            <div className="input-icon-wrapper">
              <Lock size={20} className="input-icon" />
            </div>
            <input 
              type="password" 
              className="premium-input" 
              placeholder="Password" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
          </div>

          <div className="premium-form-options">
            <label className="premium-checkbox">
              <input type="checkbox" />
              <span className="checkmark"></span>
              Remember me
            </label>
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>

          <button type="submit" className={`premium-btn-primary ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="premium-auth-footer">
          Don't have an account?{' '}
          <button className="text-btn" onClick={() => onNavigate('register')}>
            Create one now
          </button>
        </div>
      </div>
    </div>
  );
}
