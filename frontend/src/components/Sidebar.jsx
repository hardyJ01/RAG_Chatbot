import React from 'react';

const NAV = [
  { id: 'upload', icon: '⬆', label: 'Upload PDF' },
  { id: 'chat',   icon: '◎', label: 'Ask Questions' },
];

export default function Sidebar({ active, onChange, docCount }) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.section}>
        <div style={styles.label}>Menu</div>
        {NAV.map(item => (
          <button
            key={item.id}
            style={{
              ...styles.navItem,
              ...(active === item.id ? styles.navActive : {}),
            }}
            onClick={() => onChange(item.id)}
          >
            <span style={styles.icon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {docCount > 0 && (
        <div style={styles.docBadge}>
          <span style={styles.docCount}>{docCount}</span>
          <span style={styles.docLabel}>
            doc{docCount !== 1 ? 's' : ''} ingested
          </span>
        </div>
      )}
    </aside>
  );
}

const styles = {
  sidebar: {
    width:         '220px',
    borderRight:   '1px solid rgba(255,255,255,0.06)',
    background:    'var(--surface)',
    display:       'flex',
    flexDirection: 'column',
    padding:       '20px 12px',
    gap:           '4px',
  },
  section: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
    flex:          1,
  },
  label: {
    fontFamily:    'var(--mono)',
    fontSize:      '10px',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    color:         'var(--muted)',
    padding:       '0 10px',
    marginBottom:  '8px',
  },
  navItem: {
    display:      'flex',
    alignItems:   'center',
    gap:          '10px',
    padding:      '10px 12px',
    borderRadius: '8px',
    cursor:       'pointer',
    border:       '1px solid transparent',
    background:   'transparent',
    color:        'var(--muted)',
    fontFamily:   'var(--sans)',
    fontSize:     '14px',
    width:        '100%',
    textAlign:    'left',
    transition:   'all 0.15s',
  },
  navActive: {
    background:  'rgba(94,106,210,0.12)',
    borderColor: 'rgba(94,106,210,0.25)',
    color:       '#7880e8',
  },
  icon: {
    fontSize: '15px',
    width:    '18px',
  },
  docBadge: {
    display:       'flex',
    alignItems:    'center',
    gap:           '8px',
    padding:       '10px 12px',
    background:    'rgba(62,207,142,0.07)',
    border:        '1px solid rgba(62,207,142,0.15)',
    borderRadius:  '8px',
    marginTop:     'auto',
  },
  docCount: {
    fontFamily:  'var(--mono)',
    fontSize:    '18px',
    fontWeight:  '600',
    color:       '#3ecf8e',
  },
  docLabel: {
    fontSize: '12px',
    color:    'var(--muted)',
  },
};