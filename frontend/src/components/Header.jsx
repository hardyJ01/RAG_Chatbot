import React from 'react';

export default function Header({ apiOnline }) {
  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <div style={styles.logoIcon}>⬡</div>
        <span style={styles.logoText}>Scale<strong>RAG</strong></span>
      </div>
      <div style={styles.pill}>
        <span style={{
          ...styles.dot,
          background: apiOnline === null ? '#5c5f7a'
                    : apiOnline         ? '#3ecf8e'
                                        : '#e5534b',
          boxShadow: apiOnline
            ? '0 0 6px rgba(62,207,142,0.6)'
            : 'none',
        }} />
        <span style={styles.pillText}>
          {apiOnline === null ? 'connecting...' : apiOnline ? 'API online' : 'API offline'}
        </span>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 28px',
    height:         '60px',
    borderBottom:   '1px solid rgba(255,255,255,0.06)',
    background:     'rgba(13,14,20,0.9)',
    backdropFilter: 'blur(10px)',
    position:       'sticky',
    top:            0,
    zIndex:         100,
  },
  logo: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
  },
  logoIcon: {
    width:          '32px',
    height:         '32px',
    background:     'linear-gradient(135deg, #5e6ad2, #3ecf8e)',
    borderRadius:   '8px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '16px',
  },
  logoText: {
    fontFamily: 'var(--sans)',
    fontSize:   '18px',
    color:      'var(--text)',
  },
  pill: {
    display:      'flex',
    alignItems:   'center',
    gap:          '7px',
    padding:      '5px 12px',
    background:   'var(--card)',
    border:       '1px solid var(--border)',
    borderRadius: '20px',
  },
  dot: {
    width:        '7px',
    height:       '7px',
    borderRadius: '50%',
    transition:   'background 0.3s',
  },
  pillText: {
    fontFamily: 'var(--mono)',
    fontSize:   '11px',
    color:      'var(--muted)',
  },
};