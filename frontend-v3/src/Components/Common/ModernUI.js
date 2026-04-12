import React from 'react';

/**
 * ModernHeader - Clean page header for the DesignKit theme
 */
export const ModernHeader = ({ title, subtitle, actions, children }) => (
  <div className="modern-header">
    <div className="header-info">
      <h4>{title}</h4>
      <p>{subtitle}</p>
      {children}
    </div>
    <div className="header-actions">
      {actions}
    </div>
  </div>
);

/**
 * ModernStatWidget - A glowing counter for dashboard stats
 */
export const ModernStatWidget = ({ title, value, label, icon, color = 'primary', onClick, isActive }) => (
  <div 
    className={`modern-widget-item modern-card ${isActive ? 'border-primary' : ''}`} 
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default', padding: '1.5rem' }}
  >
    <div className="d-flex align-items-center justify-content-between mb-3">
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--kit-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </span>
      <div style={{ color: `var(--kit-${color})`, fontSize: '1.25rem' }}>
        <i className={icon}></i>
      </div>
    </div>
    <h3 className="mb-2" style={{ fontSize: '1.75rem' }}>{value}</h3>
    <ModernBadge color={color}>{label}</ModernBadge>
  </div>
);

/**
 * ModernSearchBox - Clean integrated search
 */
export const ModernSearchBox = ({ value, onChange, placeholder = "Tìm kiếm...", style = {} }) => (
  <div className="modern-search-bar" style={style}>
    <i className="ri-search-2-line"></i>
    <input 
      type="text" 
      value={value} 
      onChange={onChange}
      placeholder={placeholder}
    />
  </div>
);

/**
 * ModernCard - A stylish card using DesignKit tokens
 */
export const ModernCard = ({ children, className = '', ...props }) => (
  <div className={`modern-card ${className}`} {...props}>
    {children}
  </div>
);

/**
 * ModernTable - A clean, minimalist table with modern typography
 */
export const ModernTable = ({ children, className = '', ...props }) => (
  <div className="modern-table-container">
    <div className="table-responsive">
      <table className={`modern-table ${className}`} {...props}>
        {children}
      </table>
    </div>
  </div>
);

/**
 * ModernBadge - Soft-styled badges with customizable colors
 */
export const ModernBadge = ({ children, color = 'primary', className = '', ...props }) => (
  <span className={`modern-badge soft-${color} ${className}`} {...props}>
    {children}
  </span>
);

/**
 * ModernButton - Rounded buttons with subtle hover effects
 */
export const ModernButton = ({ children, variant = 'primary', className = '', ...props }) => (
  <button className={`modern-btn ${variant} ${className}`} {...props}>
    {children}
  </button>
);

/**
 * ModernProgress - A sleek progress bar using DesignKit variables
 */
export const ModernProgress = ({ value, color = 'success', max = 100 }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="modern-progress-container">
      <div className="bg-bar">
        <div 
          className="fill-bar" 
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: `var(--kit-${color})` 
          }} 
        />
      </div>
    </div>
  );
};
