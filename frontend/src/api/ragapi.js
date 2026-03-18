const BASE = '/api/v1';

// ── Health ────────────────────────────────────────────────────
export async function checkHealth() {
  const r = await fetch('/health');
  return r.ok;
}

// ── Ingest ────────────────────────────────────────────────────
export async function ingestDocument(text, docId) {
  const r = await fetch(`${BASE}/ingest`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, doc_id: docId }),
  });
  if (!r.ok) throw new Error(`Ingest failed: ${r.status}`);
  return r.json();
}

// ── Query ─────────────────────────────────────────────────────
export async function sendQuery(query, sessionId, checkpointId = null) {
  const body = { query, session_id: sessionId, top_k: 5 };
  if (checkpointId) body.checkpoint_id = checkpointId;

  const r = await fetch(`${BASE}/query`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Query failed: ${r.status}`);
  return r.json();
}

// ── Job status ────────────────────────────────────────────────
export async function getJobStatus(jobId) {
  const r = await fetch(`${BASE}/status/${jobId}`);
  if (!r.ok) throw new Error(`Status fetch failed: ${r.status}`);
  return r.json();
}

// ── Poll until finished ───────────────────────────────────────
export async function pollJob(jobId, maxWaitMs = 60000, intervalMs = 1500) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(res => setTimeout(res, intervalMs));
    const data = await getJobStatus(jobId);
    if (data.status === 'finished' || data.status === 'failed') {
      return data;
    }
  }
  return { status: 'timeout', result: null };
}