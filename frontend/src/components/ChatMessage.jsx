import React from 'react';

export default function ChatMessage({ role, text, sources, isThinking }) {
  const isUser = role === 'user';

  if (isThinking) {
    return (
      <div style={{ ...styles.row, justifyContent: 'flex-start' }}>
        <div style={styles.avatarAI}>⬡</div>
        <div style={styles.thinkBubble}>
          <span style={styles.thinkDot} />
          <span style={{ ...styles.thinkDot, animationDelay: '0.2s' }} />
          <span style={{ ...styles.thinkDot, animationDelay: '0.4s' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.row,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeIn 0.25s ease',
    }}>
      {!isUser && <div style={styles.avatarAI}>⬡</div>}

      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={isUser ? styles.bubbleUser : styles.bubbleAI}>
          {text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
        {sources > 0 && (
          <div style={styles.sourceTag}>
            ◎ {sources} source chunk{sources !== 1 ? 's' : ''} retrieved
          </div>
        )}
      </div>

      {isUser && <div style={styles.avatarUser}>U</div>}
    </div>
  );
}

const styles = {
  row: {
    display:    'flex',
    alignItems: 'flex-end',
    gap:        '10px',
  },
  avatarAI: {
    width:          '30px',
    height:         '30px',
    background:     'linear-gradient(135deg, #5e6ad2, #3ecf8e)',
    borderRadius:   '8px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '13px',
    flexShrink:     0,
  },
  avatarUser: {
    width:          '30px',
    height:         '30px',
    background:     'rgba(255,255,255,0.07)',
    border:         '1px solid rgba(255,255,255,0.1)',
    borderRadius:   '8px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '12px',
    color:          'var(--muted)',
    flexShrink:     0,
  },
  bubbleAI: {
    background:   'var(--card)',
    border:       '1px solid rgba(255,255,255,0.07)',
    borderRadius: '4px 12px 12px 12px',
    padding:      '12px 16px',
    fontSize:     '14px',
    lineHeight:   '1.7',
    color:        'var(--text)',
  },
  bubbleUser: {
    background:   'rgba(94,106,210,0.15)',
    border:       '1px solid rgba(94,106,210,0.25)',
    borderRadius: '12px 4px 12px 12px',
    padding:      '12px 16px',
    fontSize:     '14px',
    lineHeight:   '1.7',
    color:        'var(--text)',
  },
  sourceTag: {
    alignSelf:    'flex-start',
    fontFamily:   'var(--mono)',
    fontSize:     '11px',
    color:        '#3ecf8e',
    padding:      '3px 10px',
    background:   'rgba(62,207,142,0.07)',
    border:       '1px solid rgba(62,207,142,0.15)',
    borderRadius: '20px',
  },
  thinkBubble: {
    background:   'var(--card)',
    border:       '1px solid rgba(255,255,255,0.07)',
    borderRadius: '4px 12px 12px 12px',
    padding:      '14px 18px',
    display:      'flex',
    gap:          '5px',
    alignItems:   'center',
  },
  thinkDot: {
    display:         'inline-block',
    width:           '6px',
    height:          '6px',
    background:      'var(--muted)',
    borderRadius:    '50%',
    animation:       'pulse 1.2s ease infinite',
  },
};