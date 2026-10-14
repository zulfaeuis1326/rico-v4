import { useEffect, useRef, useState, useCallback } from "react";

// Hook realtime V4: pakai SSE (/api/realtime) sebagai kanal utama,
// otomatis fallback ke polling /api/ritasi kalau SSE gagal.
// Kembalian: { recap, history, live, connectedAt }
export function useRealtime({ historyUrl, intervalMs }) {
  const [recap, setRecap] = useState(null);
  const [history, setHistory] = useState([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState(null);
  const esRef = useRef(null);
  const pollRef = useRef(null);

  const loadPoll = useCallback(async function () {
    try {
      const r = await fetch("/api/ritasi", { cache: "no-store" });
      if (r.ok) { setRecap(await r.json()); setError(null); }
      if (historyUrl) {
        const h = await fetch(historyUrl, { cache: "no-store" });
        if (h.ok) { const d = await h.json(); setHistory(d.clicks || d.history || []); }
      }
    } catch (e) { setError(e.message); }
  }, [historyUrl]);

  useEffect(function () {
    let stopped = false;
    // Polling awal langsung
    loadPoll();
    // Coba SSE
    try {
      const es = new EventSource("/api/realtime");
      esRef.current = es;
      es.onmessage = function (ev) {
        if (stopped) return;
        try {
          const d = JSON.parse(ev.data);
          if (d.recap) setRecap(d.recap);
          if (d.history) setHistory(d.history);
          setLive(true); setError(null);
        } catch (e) { /* abaikan frame rusak */ }
      };
      es.onerror = function () {
        if (stopped) return;
        setLive(false);
        try { es.close(); } catch (e) {}
        // fallback polling
        if (!pollRef.current) {
          pollRef.current = setInterval(loadPoll, intervalMs || 4000);
        }
      };
    } catch (e) {
      pollRef.current = setInterval(loadPoll, intervalMs || 4000);
    }
    // Safety polling lambat tetap jalan walau SSE hidup (sinkronisasi history)
    const slow = setInterval(function () { if (!stopped && !live) loadPoll(); }, intervalMs || 4000);
    return function () {
      stopped = true;
      try { esRef.current && esRef.current.close(); } catch (e) {}
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(slow);
    };
  }, [loadPoll, intervalMs, live]);

  return { recap, setRecap, history, setHistory, live, error, reload: loadPoll };
}
