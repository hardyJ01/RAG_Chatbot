import React, { useState, useEffect } from 'react';
import Header   from './components/Header';
import Sidebar  from './components/Sidebar';
import UploadPage from './components/UploadPage';
import ChatPage   from './components/ChatPage';
import { checkHealth } from './api/ragApi';

export default function App() {
  const [page,      setPage]      = useState('upload');
  const [apiOnline, setApiOnline] = useState(null);
  const [docCount,  setDocCount]  = useState(0);

  // Health check on mount and every 30s
  useEffect(() => {
    const check = async () => {
      try {
        const ok = await checkHealth();
        setApiOnline(ok);
      } catch {
        setApiOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Called by UploadPage when a doc is successfully ingested
  function handleIngested(docId) {
    setDocCount(prev => prev + 1);
  }

  return (
    <div style={styles.root}>
      <Header apiOnline={apiOnline} />
      <div style={styles.body}>
        <Sidebar active={page} onChange={setPage} docCount={docCount} />
        <main style={styles.main}>
          {page === 'upload' && (
            <UploadPage onIngested={handleIngested} />
          )}
          {page === 'chat' && (
            <ChatPage docCount={docCount} />
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  root: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100vh',
    overflow:      'hidden',
  },
  body: {
    display:  'flex',
    flex:     1,
    overflow: 'hidden',
  },
  main: {
    flex:     1,
    overflow: 'hidden',
    display:  'flex',
    flexDirection: 'column',
  },
};