import React from 'react';

function Tabs({ tabs, active, onChange }) {
  return (
    <nav className="tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          className={`tab-btn ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export default Tabs;


