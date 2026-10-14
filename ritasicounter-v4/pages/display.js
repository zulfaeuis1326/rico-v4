import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { atLeast } from "../lib/roles";
import { useAuthCheck } from "../hooks/useAuthCheck";
import AdminShell from "../components/AdminShell";
import DetailTable from "../components/display/DetailTable";

// three.js butuh DOM/canvas -- WAJIB no-SSR, kalau di-render di server bakal error.
const Scene3D = dynamic(() => import("../components/display/Scene3D"), { ssr: false });

const REFRESH_MS = 15000;

export default function Display() {
  const router = useRouter();
  const { authUser, authError, retry: retryAuth } = useAuthCheck(router, {
    minRole: (role) => atLeast(role, "pengawas"),
    redirectIfBelow: "/",
  });
  const [view, setView] = useState("table"); // "table" | "3d"
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [clock, setClock] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/display-data", { cache: "no-store" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Error ${res.status}`);
        return;
      }
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!authUser) return;
    loadData();
    const interval = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(interval);
  }, [authUser, loadData]);

  // Jam berjalan real-time di pojok, biar kerasa "LIVE" kayak referensi dashboard digital.
  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString("id-ID", { hour12: false }));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (authError) {
    return (
      <div className="container">
        <div className="card">
          <div className="hint" style={{ color: "var(--danger)" }}>{authError}</div>
          <button className="btn btn-secondary" style={{ width: "auto", padding: "0 16px", marginTop: 10 }} onClick={retryAuth}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="container">
        <div className="card"><div className="hint">Memuat...</div></div>
      </div>
    );
  }

  const modeLabel = data?.shift?.shiftType === 2 ? "malam" : "siang";

  return (
    <AdminShell
      authUser={authUser}
      active="display"
      title="Live TV"
      subtitle={(data?.shift ? data.shift.label : "Tidak ada shift berjalan") + " · mode " + modeLabel + " · " + clock}
      onLogout={handleLogout}
      actions={
        <div className="dash-tabs">
          <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Tabel Detail</button>
          <button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}>Animasi 3D</button>
        </div>
      }
    >
      <div className="display-topstrip">
        <span className="display-live-dot">&#9679; LIVE</span>
        <span>{clock}</span>
        <span className="display-topstrip-sep">&middot;</span>
        <span>{data?.shift ? data.shift.label : "Tidak ada shift berjalan"}</span>
      </div>

      {error && <div className="dash-card"><div className="hint" style={{ color: "var(--bad)" }}>Error: {error}</div></div>}

      {view === "table" ? <DetailTable data={data} /> : <Scene3D data={data} />}
    </AdminShell>
  );
}
