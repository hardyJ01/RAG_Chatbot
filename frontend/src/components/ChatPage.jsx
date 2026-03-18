import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { sendQuery, pollJob } from '../api/ragApi';

const SESSION_ID = 'user_' + Math.random().toString(36).slice(2, 7);

export default function ChatPage({ docCount }) {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [checkpoint,  setCheckpoint]  = useState(null);
  const bottomRef = useRef();
  const textareaRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const { job_id } = await sendQuery(q, SESSION_ID, checkpoint);
      const result     = await pollJob(job_id, 60000);

      if (result.status === 'finished' && result.result?.answer) {
        setMessages(prev => [...prev, {
          role:    'ai',
          text:    result.result.answer,
          sources: result.result.hits_count || 0,
        }]);
        if (result.result.checkpoint_id) {
          setCheckpoint(result.result.checkpoint_id);
        }
      } else {
        const err = result.result?.error || 'No answer returned.';
        setMessages(prev => [...prev, { role: 'ai', text: `Error: ${err}`, sources: 0 }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: `Connection error: ${e.message}`, sources: 0 }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function clearChat() {
    setMessages([]);
    setCheckpoint(null);
  }

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Ask Questions</div>
          {checkpoint && (
            <div style={styles.ckptTag}>⬡ memory active</div>
          )}
        </div>
        {messages.length > 0 && (
          <button style={styles.clearBtn} onClick={clearChat}>
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={styles.chatArea}>
        {isEmpty && (
          <div style={styles.empty}>
            {docCount === 0 ? (
              <>
                <div style={styles.emptyIcon}>📄</div>
                <div style={styles.emptyTitle}>No documents uploaded yet</div>
                <div style={styles.emptySub}>Upload a PDF first, then come back to ask questions</div>
              </>
            ) : (
              <>
                <div style={styles.emptyIcon}>◎</div>
                <div style={styles.emptyTitle}>Ask anything about your document</div>
                <div style={styles.emptySub}>
                  {docCount} document{docCount !== 1 ? 's' : ''} ready · memory saves across turns
                </div>
              </>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            text={msg.text}
            sources={msg.sources}
          />
        ))}

        {loading && <ChatMessage isThinking />}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={styles.inputBar}>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={docCount === 0 ? 'Upload a PDF first...' : 'Ask a question... (Enter to send)'}
          disabled={loading || docCount === 0}
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: loading || !input.trim() || docCount === 0 ? 0.4 : 1,
          }}
          onClick={handleSend}
          disabled={loading || !input.trim() || docCount === 0}
        >
          {loading ? <div style={styles.spinner} /> : '↑'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100%',
    animation:     'fadeIn 0.3s ease',
  },
  topbar: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '24px 32px 0',
    flexShrink:     0,
  },
  title: {
    fontSize:      '22px',
    fontWeight:    '600',
    letterSpacing: '-0.4px',
  },
  ckptTag: {
    marginTop:    '4px',
    display:      'inline-block',
    fontFamily:   'var(--mono)',
    fontSize:     '11px',
    color:        '#3ecf8e',
    padding:      '2px 8px',
    background:   'rgba(62,207,142,0.08)',
    border:       '1px solid rgba(62,207,142,0.15)',
    borderRadius: '20px',
  },
  clearBtn: {
    background:   'transparent',
    border:       '1px solid var(--border)',
    borderRadius: '6px',
    color:        'var(--muted)',
    fontFamily:   'var(--sans)',
    fontSize:     '12px',
    padding:      '6px 12px',
    cursor:       'pointer',
  },
  chatArea: {
    flex:          1,
    overflowY:     'auto',
    padding:       '24px 32px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '16px',
  },
  empty: {
    margin:        'auto',
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '10px',
    paddingBottom: '60px',
    textAlign:     'center',
  },
  emptyIcon:  { fontSize: '40px', opacity: 0.4 },
  emptyTitle: { fontSize: '16px', fontWeight: '500', color: 'var(--muted)' },
  emptySub:   { fontSize: '13px', color: 'var(--muted)', opacity: 0.7 },
  inputBar: {
    display:   'flex',
    gap:       '10px',
    padding:   '16px 32px 24px',
    flexShrink: 0,
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  textarea: {
    flex:        1,
    background:  'var(--card)',
    border:      '1px solid rgba(255,255,255,0.08)',
    borderRadius:'10px',
    padding:     '12px 16px',
    color:       'var(--text)',
    fontFamily:  'var(--sans)',
    fontSize:    '14px',
    outline:     'none',
    resize:      'none',
    lineHeight:  '1.5',
    maxHeight:   '120px',
  },
  sendBtn: {
    width:          '46px',
    height:         '46px',
    background:     '#5e6ad2',
    border:         'none',
    borderRadius:   '10px',
    color:          '#fff',
    fontSize:       '20px',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    transition:     'opacity 0.2s',
  },
  spinner: {
    width:       '18px',
    height:      '18px',
    border:      '2px solid rgba(255,255,255,0.2)',
    borderTop:   '2px solid #fff',
    borderRadius:'50%',
    animation:   'spin 0.7s linear infinite',
  },
};