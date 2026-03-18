import React, { useState, useRef } from 'react';
import { extractTextFromPDF, fileNameToDocId } from '../api/pdfExtractor';
import { ingestDocument, pollJob } from '../api/ragApi';

export default function UploadPage({ onIngested }) {
  const [dragging,  setDragging]  = useState(false);
  const [file,      setFile]      = useState(null);
  const [status,    setStatus]    = useState('idle'); // idle | extracting | ingesting | done | error
  const [message,   setMessage]   = useState('');
  const [chunks,    setChunks]    = useState(null);
  const inputRef = useRef();

  // ── Drag handlers ────────────────────────────────────────────
  const onDragOver  = e => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = e => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') handleFile(dropped);
    else setMessage('Please drop a PDF file.');
  };

  const onFileChange = e => {
    const picked = e.target.files[0];
    if (picked) handleFile(picked);
  };

  // ── Main pipeline ────────────────────────────────────────────
  async function handleFile(f) {
    setFile(f);
    setStatus('extracting');
    setMessage('Reading PDF...');
    setChunks(null);

    try {
      // 1. Extract text from PDF
      const text = await extractTextFromPDF(f);
      if (!text || text.length < 20) {
        throw new Error('Could not extract text. The PDF may be image-only or empty.');
      }

      const docId = fileNameToDocId(f.name);
      setMessage(`Extracted ${text.length.toLocaleString()} characters. Ingesting...`);
      setStatus('ingesting');

      // 2. Send to FastAPI
      const { job_id } = await ingestDocument(text, docId);

      setMessage('Processing chunks...');

      // 3. Poll for result
      const result = await pollJob(job_id);

      if (result.status === 'finished') {
        setStatus('done');
        setChunks(result.result?.chunks ?? '?');
        setMessage(`"${f.name}" is ready to query.`);
        onIngested(docId);
      } else {
        throw new Error(result.result?.error || 'Ingestion failed');
      }

    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  function reset() {
    setFile(null);
    setStatus('idle');
    setMessage('');
    setChunks(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const busy = status === 'extracting' || status === 'ingesting';

  return (
    <div style={styles.page}>
      <div style={styles.heading}>
        <h1 style={styles.title}>Upload a PDF</h1>
        <p style={styles.sub}>Your document will be chunked and embedded automatically</p>
      </div>

      {/* Drop zone */}
      <div
        style={{
          ...styles.dropzone,
          ...(dragging         ? styles.dropzoneDrag : {}),
          ...(status === 'done'  ? styles.dropzoneDone : {}),
          ...(status === 'error' ? styles.dropzoneError : {}),
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !busy && status !== 'done' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        {/* Idle state */}
        {status === 'idle' && (
          <>
            <div style={styles.dropIcon}>📄</div>
            <div style={styles.dropMain}>Drop your PDF here</div>
            <div style={styles.dropSub}>or click to browse</div>
          </>
        )}

        {/* Processing */}
        {busy && (
          <>
            <div style={styles.spinner} />
            <div style={styles.dropMain}>{message}</div>
            <div style={styles.dropSub}>{file?.name}</div>
          </>
        )}

        {/* Done */}
        {status === 'done' && (
          <>
            <div style={styles.doneIcon}>✓</div>
            <div style={{ ...styles.dropMain, color: '#3ecf8e' }}>{message}</div>
            {chunks && (
              <div style={styles.chunkBadge}>{chunks} chunks embedded</div>
            )}
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div style={styles.errorIcon}>✕</div>
            <div style={{ ...styles.dropMain, color: '#e5534b' }}>Upload failed</div>
            <div style={{ ...styles.dropSub, color: '#e5534b' }}>{message}</div>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {status === 'done' && (
          <button style={styles.btnPrimary} onClick={reset}>
            Upload another PDF
          </button>
        )}
        {status === 'error' && (
          <button style={styles.btnSecondary} onClick={reset}>
            Try again
          </button>
        )}
      </div>

      {/* Info */}
      <div style={styles.infoRow}>
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>⬡</div>
          <div>
            <div style={styles.infoTitle}>Chunked</div>
            <div style={styles.infoText}>Split into 512-char overlapping segments</div>
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>◎</div>
          <div>
            <div style={styles.infoTitle}>Embedded</div>
            <div style={styles.infoText}>Converted to vectors for semantic search</div>
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>◫</div>
          <div>
            <div style={styles.infoTitle}>Ready</div>
            <div style={styles.infoText}>Instantly queryable with natural language</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding:       '36px 40px',
    maxWidth:      '640px',
    margin:        '0 auto',
    display:       'flex',
    flexDirection: 'column',
    gap:           '24px',
    animation:     'fadeIn 0.3s ease',
  },
  heading: { display: 'flex', flexDirection: 'column', gap: '6px' },
  title: {
    fontFamily:  'var(--sans)',
    fontSize:    '26px',
    fontWeight:  '600',
    letterSpacing: '-0.5px',
  },
  sub: {
    fontSize: '14px',
    color:    'var(--muted)',
  },
  dropzone: {
    borderWidth:    '2px',
    borderStyle:    'dashed',
    borderColor:    'rgba(255,255,255,0.1)',
    borderRadius:   '16px',
    padding:        '60px 40px',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '10px',
    cursor:         'pointer',
    transition:     'all 0.2s',
    background:     'var(--card)',
    minHeight:      '240px',
    textAlign:      'center',
  },
  dropzoneDrag: {
    borderColor: 'rgba(94,106,210,0.6)',
    background:  'rgba(94,106,210,0.06)',
  },
  dropzoneDone: {
    borderColor: 'rgba(62,207,142,0.4)',
    background:  'rgba(62,207,142,0.04)',
    cursor:      'default',
  },
  dropzoneError: {
    borderColor: 'rgba(229,83,75,0.4)',
    background:  'rgba(229,83,75,0.04)',
    cursor:      'default',
  },
  dropIcon:  { fontSize: '40px', marginBottom: '4px' },
  doneIcon:  { fontSize: '36px', color: '#3ecf8e', fontWeight: '600' },
  errorIcon: { fontSize: '36px', color: '#e5534b', fontWeight: '600' },
  dropMain: {
    fontSize:   '16px',
    fontWeight: '500',
    color:      'var(--text)',
  },
  dropSub: {
    fontSize:   '13px',
    color:      'var(--muted)',
    fontFamily: 'var(--mono)',
  },
  spinner: {
    width:       '32px',
    height:      '32px',
    border:      '3px solid rgba(255,255,255,0.08)',
    borderTop:   '3px solid #5e6ad2',
    borderRadius:'50%',
    animation:   'spin 0.8s linear infinite',
    marginBottom:'8px',
  },
  chunkBadge: {
    marginTop:    '8px',
    padding:      '4px 12px',
    background:   'rgba(62,207,142,0.1)',
    border:       '1px solid rgba(62,207,142,0.2)',
    borderRadius: '20px',
    fontSize:     '12px',
    color:        '#3ecf8e',
    fontFamily:   'var(--mono)',
  },
  actions: { display: 'flex', gap: '10px' },
  btnPrimary: {
    padding:      '10px 22px',
    background:   '#5e6ad2',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontFamily:   'var(--sans)',
    fontSize:     '14px',
    fontWeight:   '500',
    cursor:       'pointer',
  },
  btnSecondary: {
    padding:      '10px 22px',
    background:   'var(--card)',
    color:        'var(--text)',
    border:       '1px solid var(--border)',
    borderRadius: '8px',
    fontFamily:   'var(--sans)',
    fontSize:     '14px',
    cursor:       'pointer',
  },
  infoRow: {
    display:  'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap:      '12px',
    marginTop:'4px',
  },
  infoCard: {
    display:      'flex',
    gap:          '10px',
    padding:      '14px',
    background:   'var(--card)',
    border:       '1px solid var(--border)',
    borderRadius: '10px',
    alignItems:   'flex-start',
  },
  infoIcon: { fontSize: '16px', marginTop: '1px', flexShrink: 0 },
  infoTitle: { fontSize: '13px', fontWeight: '500', marginBottom: '3px' },
  infoText:  { fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5' },
};