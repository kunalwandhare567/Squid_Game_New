import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ArrowLeft, KeyRound, ShieldAlert } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';

const getHostPassword = () => {
  return (import.meta.env.VITE_HOST_PASSWORD || '0506').trim();
};
const AUTH_STORAGE_KEY = 'sq_host_auth_token';

export default function HostAuthGate({ onAuthorized, onCancel }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef(null);
  const audio = useAudio();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleVerify(e) {
    e?.preventDefault();
    const cleanPassword = password.trim();

    const expectedPassword = getHostPassword();

    if (cleanPassword === expectedPassword) {
      setError(false);
      try {
        sessionStorage.setItem(AUTH_STORAGE_KEY, expectedPassword);
      } catch (err) {}
      audio?.sfxCorrect?.();
      onAuthorized();
    } else {
      setError(true);
      setErrorMessage('Access Denied: Incorrect Password. Please try again.');
      setIsShaking(true);
      audio?.sfxWrong?.();
      setPassword('');
      setTimeout(() => setIsShaking(false), 500);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="app host-auth-arena">
      <div className="bg-layer" />
      <div className="tint-layer" />

      <div className="host-auth-container">
        {/* Header Branding */}
        <div className="host-auth-brand">
          <div className="top-geo-badges" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <span className="geo-icon pink">○</span>
            <span className="geo-icon blue">△</span>
            <span className="geo-icon green">□</span>
          </div>
          <div className="brand" style={{ fontSize: '13px', letterSpacing: '3px' }}>IAE SQUID SURVIVAL</div>
          <div className="brand-sub-title" style={{ fontSize: '10px', color: 'var(--c-sub)', marginTop: '2px' }}>
            HOST CONSOLE • SECURITY ACCESS
          </div>
        </div>

        {/* Security Shield Card */}
        <div className={`host-auth-card ${isShaking ? 'shake-card' : ''}`}>
          <div className="auth-lock-icon-wrap">
            {error ? (
              <ShieldAlert size={36} color="#ff2d78" />
            ) : (
              <Lock size={36} color="#57ffb0" />
            )}
          </div>

          <h2 className="auth-title">Host Verification</h2>
          <p className="auth-subtitle">
            Enter the host password to access the game control panel.
          </p>

          <form onSubmit={handleVerify} className="auth-form">
            <div className="auth-input-group">
              <KeyRound size={18} className="auth-input-icon" />
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Enter Host Password"
                className={`auth-pin-input ${error ? 'input-error' : ''}`}
                autoComplete="current-password"
                maxLength={20}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="auth-error-banner">
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              className="cta auth-submit-btn"
              disabled={password.trim().length === 0}
            >
              🔓 Enter Host Screen
            </button>
          </form>

          {/* Return to landing */}
          <div className="auth-footer-actions">
            <button
              type="button"
              className="auth-back-btn"
              onClick={() => {
                if (onCancel) onCancel();
                else window.location.href = window.location.origin + window.location.pathname;
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Player Join</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function isHostAuthenticated() {
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === getHostPassword();
  } catch (err) {
    return false;
  }
}
