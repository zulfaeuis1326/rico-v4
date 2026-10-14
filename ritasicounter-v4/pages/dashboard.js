import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { atLeast } from "../lib/roles";
import Topbar from "../components/home/Topbar";

const MAT_COLORS = { OB: "#8b5a2b", COAL: "#475569", SOIL: "#b45309", SOLU: "#0891b2", MUD: "#65a30d" };

export default function Dashboard() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(undefined);
  const [range, setRange] = useState("day");
  const [data, setData] = useState(null);
  const [recap, setRecap] = useState(null);
  const [error, setError] = useState(null);

  useEffect(function () {
    fetch("/api/auth/me", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.user) router.push("/login");
      else if (!atLeast(d.user.role, "pengawas")) router.push("/");
      else setAuthUser(d.user);
    }).catch(function () { router.push("/login"); });
  }, [router]);

  const load = useCallback(async function () {
    try {
      const r = await fetch("/api/dashboard?range=" + range);
      if (!r.ok) { setError("Gagal memuat"); return; }
      setData(await r.json()); setError(null);
      const rc = await fetch("/api/ritasi");
      if (rc.ok) setRecap(await rc.json());
    } catch (e) { setError(e.message); }
  }, [range]);

  useEffect(function () {
    if (!authUser) return;
    load();
    // V4: SSE untuk rekap berjalan + polling ringan untuk analitik
    let es = null;
    try {
      es = new EventSource("/api/realtime");
      es.onmessage = function (ev) {
        try { const d = JSON.parse(ev.data); if (d.recap) setRecap(d.recap); } catch (e) {}
      };
    } catch (e) {}
    const t = setInterval(load, 15000);
    return function () { clearInterval(t); try { es && es.close(); } catch (e) {} };
  }, [authUser, load]);

  if (authUser === undefined) return <div className="container"><div className="card"><div className="hint">Memuat...</div></div></div>;
  if (!authUser) return null;
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }

  const topUnit = data && data.unitSeries && data.unitSeries.length ? data.unitSeries.slice().sort(function (a, b) { return b.total - a.total; })[0] : null;

  return (
    <div className="v4-page">
      <Topbar authUser={authUser} canMonitorAll isAdmin={atLeast(authUser.role, "admin")} isOperator={false} onLogout={logout} currentPage="dashboard" />
      <main className="container">
        <div className="card hero">
          <div className="clock" style={{ fontSize: 22 }}>Dashboard Analitik V4</div>
          <div className="hint" style={{ color: "#e0e7ff" }}>Grand total periode: <b style={{ color: "#fff" }}>{data ? data.grandTotal : "-"}</b> rit · Top unit: <b style={{ color: "#fff" }}>{topUnit ? topUnit.name + " (" + topUnit.total + ")" : "-"}</b></div>
        </div>
        <div className="card">
          <div className="material-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button className={"material-btn" + (range === "day" ? " active" : "")} onClick={function () { setRange("day"); }}>Per Hari (7 hari)</button>
            <button className={"material-btn" + (range === "shift" ? " active" : "")} onClick={function () { setRange("shift"); }}>Per Shift (10 shift)</button>
          </div>
        </div>
        {error && <div className="card"><div className="hint" style={{ color: "var(--bad)" }}>Error: {error}</div></div>}
        {data && (<>
          <div className="kpi-grid">
            <div className="kpi" style={{ "--kc": "#4f46e5" }}><div className="kpi-label">Grand Total</div><div className="kpi-value">{data.grandTotal}</div><div className="kpi-sub">seluruh periode</div></div>
            <div className="kpi" style={{ "--kc": "#06b6d4" }}><div className="kpi-label">Unit Produktif</div><div className="kpi-value">{data.unitSeries ? data.unitSeries.filter(function (u) { return u.total > 0; }).length : 0}</div><div className="kpi-sub">dari {data.unitSeries ? data.unitSeries.length : 0} unit</div></div>
            <div className="kpi" style={{ "--kc": "#16a34a" }}><div className="kpi-label">Shift Berjalan</div><div className="kpi-value">{recap ? recap.grandTotal : 0}</div><div className="kpi-sub">rit shift ini</div></div>
            <div className="kpi" style={{ "--kc": "#d97706" }}><div className="kpi-label">Rata-rata</div><div className="kpi-value">{data.bucketSeries && data.bucketSeries.length ? Math.round(data.grandTotal / data.bucketSeries.length) : 0}</div><div className="kpi-sub">rit per bucket</div></div>
          </div>
          <div className="card"><div className="section-title">Total per Bucket</div>
            <ResponsiveContainer width="100%" height={220}><BarChart data={data.bucketSeries}><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
          <div className="card"><div className="section-title">Produksi per Unit</div>
            <ResponsiveContainer width="100%" height={Math.max(180, data.unitSeries.length * 32)}><BarChart data={data.unitSeries} layout="vertical" margin={{ left: 20 }}><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} /><Tooltip /><Bar dataKey="total" fill="#06b6d4" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
          <div className="card"><div className="section-title">Komposisi Material</div>
            <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={data.materialSeries.filter(function (m) { return m.total > 0; })} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={function (e) { return e.name + ": " + e.total; }}>
              {data.materialSeries.map(function (m) { return <Cell key={m.name} fill={MAT_COLORS[m.name] || "#888"} />; })}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
          <div className="card"><div className="section-title">Tren per Jam</div>
            <ResponsiveContainer width="100%" height={220}><LineChart data={data.hourlySeries}><XAxis dataKey="hour" tickFormatter={function (h) { return String(h).padStart(2, "0"); }} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip labelFormatter={function (h) { return "Jam " + String(h).padStart(2, "0"); }} /><Line type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
        </>)}
        <div className="app-footer">RitasiCounter V4 · designed by Najib.dev</div>
      </main>
    </div>
  );
}
