// frontend/src/components/BourbonBarrelToggle.jsx
import React from 'react';
import './BourbonBarrelToggle.css';

const BourbonBarrelToggle = ({ isOn = false, onChange, disabled = false, size = 'medium' }) => {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!isOn);
    }
  };

  return (
    <div
      className={`bourbon-barrel-toggle ${size} ${isOn ? 'on' : 'off'} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      role="switch"
      aria-checked={isOn}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="toggle-track">
        <div className="toggle-barrel">
          {/* Bourbon barrel SVG */}
          <svg viewBox="0 0 32 40" className="barrel-icon">
            <defs>
              <linearGradient id="barrelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B4513" />
                <stop offset="50%" stopColor="#D2691E" />
                <stop offset="100%" stopColor="#A0522D" />
              </linearGradient>
            </defs>

            {/* Barrel body */}
            <path
              d="M8 4 L24 4 L26 8 L26 32 L24 36 L8 36 L6 32 L6 8 Z"
              fill="url(#barrelGradient)"
              stroke="#654321"
              strokeWidth="1"
            />

            {/* Barrel bands */}
            <rect x="6" y="10" width="20" height="2" fill="#2F1B14" />
            <rect x="6" y="20" width="20" height="2" fill="#2F1B14" />
            <rect x="6" y="28" width="20" height="2" fill="#2F1B14" />

            {/* Barrel highlight */}
            <ellipse cx="12" cy="16" rx="2" ry="6" fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
      </div>

      <span className="sr-only">
        {isOn ? 'Tracking enabled' : 'Tracking disabled'}
      </span>
    </div>
  );
};

export default BourbonBarrelToggle;