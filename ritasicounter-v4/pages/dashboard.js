import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { atLeast } from "../lib/roles";
import Topbar from "../components/home/Topbar";

const MAT_COLORS = { OB: "#9a6b1f", COAL: "#44403c", SOIL: "#c2701d", SOLU: "#0e7490", MUD: "#6d7c2f" };
const TEAL = "#0f766e";
const RUST = "#c2410c";
const SLATE = "#78716c";

const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 };

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
  const productive = data && data.unitSeries ? data.unitSeries.filter(function (u) { return u.total > 0; }).length : 0;

  return (
    <div className="v4-page">
      <Topbar authUser={authUser} canMonitorAll isAdmin={atLeast(authUser.role, "admin")} isOperator={false} onLogout={logout} currentPage="dashboard" />
      <main className="container">
        <div className="card hero">
          <div className="clock" style={{ fontSize: 22, letterSpacing: "-.02em", fontFamily: "var(--disp)", fontWeight: 800 }}>Dashboard Analitik</div>
          <div className="hero-meta">
            <span className="hero-chip accent">Grand total <b>{data ? data.grandTotal : "-"}</b> rit</span>
            <span className="hero-chip">Top unit <b>{topUnit ? topUnit.name + " (" + topUnit.total + ")" : "-"}</b></span>
            <span className="hero-chip">Shift berjalan <b>{recap ? recap.grandTotal : 0}</b> rit</span>
          </div>
        </div>

        <div className="card">
          <div className="seg">
            <button className={range === "day" ? "active" : ""} onClick={function () { setRange("day"); }}>Per Hari · 7 hari</button>
            <button className={range === "shift" ? "active" : ""} onClick={function () { setRange("shift"); }}>Per Shift · 10 shift</button>
          </div>
        </div>

        {error && <div className="card"><div className="hint" style={{ color: "var(--bad)" }}>Error: {error}</div></div>}

        {data && (<>
          <div className="kpi-grid">
            <div className="kpi" style={{ "--kc": "#0f766e" }}><div className="kpi-label">Grand Total</div><div className="kpi-value">{data.grandTotal}</div><div className="kpi-sub">seluruh periode</div></div>
            <div className="kpi" style={{ "--kc": "#b45309" }}><div className="kpi-label">Unit Produktif</div><div className="kpi-value">{productive}</div><div className="kpi-sub">dari {data.unitSeries ? data.unitSeries.length : 0} unit</div></div>
            <div className="kpi" style={{ "--kc": "#15803d" }}><div className="kpi-label">Shift Berjalan</div><div className="kpi-value">{recap ? recap.grandTotal : 0}</div><div className="kpi-sub">rit shift ini</div></div>
            <div className="kpi" style={{ "--kc": "#78716c" }}><div className="kpi-label">Rata-rata</div><div className="kpi-value">{data.bucketSeries && data.bucketSeries.length ? Math.round(data.grandTotal / data.bucketSeries.length) : 0}</div><div className="kpi-sub">rit per bucket</div></div>
          </div>

          <div className="card"><div className="section-title">Total per Bucket</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.bucketSeries} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill={TEAL} radius={[6, 6, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card"><div className="section-title">Produksi per Unit</div>
            <ResponsiveContainer width="100%" height={Math.max(180, data.unitSeries.length * 32)}>
              <BarChart data={data.unitSeries} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: SLATE }} width={80} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="#b45309" radius={[2, 6, 6, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card"><div className="section-title">Komposisi Material</div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.materialSeries.filter(function (m) { return m.total > 0; })} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={88} innerRadius={52} paddingAngle={2} label={function (e) { return e.name + " " + e.total; }} labelLine={false} fontSize={12}>
                  {data.materialSeries.map(function (m) { return <Cell key={m.name} fill={MAT_COLORS[m.name] || "#888"} strokeWidth={0} />; })}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={9} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card"><div className="section-title">Tren per Jam</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.hourlySeries} margin={{ top: 6, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tickFormatter={function (h) { return String(h).padStart(2, "0"); }} tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={function (h) { return "Jam " + String(h).padStart(2, "0"); }} />
                <Line type="monotone" dataKey="total" stroke={RUST} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>)}
        <div className="app-footer">RitasiCounter V4 · designed by Najib.dev</div>
      </main>
    </div>
  );
}
