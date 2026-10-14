import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { atLeast } from "../lib/roles";
import Rail from "../components/Rail";

const TEAL = "#0f766e";
const TEAL_LIGHT = "#5eead4";
const AMBER = "#b45309";
const TICK = "#8a8478";
const GRID = "#e5ded1";
const MAT_COLORS = { OB: "#9a6b1f", COAL: "#44403c", SOIL: "#c2701d", SOLU: "#0e7490", MUD: "#6d7c2f" };

function Ring({ pct, color, size }) {
  const s = size || 52;
  const r = (s - 8) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <svg width={s} height={s} viewBox={"0 0 " + s + " " + s}>
      <circle cx={s / 2} cy={s / 2} r={r} fill="none" strokeWidth="6" style={{ stroke: "var(--border)" }} />
      <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={"rotate(-90 " + s / 2 + " " + s / 2 + ")"} />
    </svg>
  );
}

function ChartTip({ active, payload, label, labelPrefix }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="dash-tip">
      <div className="t-label">{labelPrefix || ""}{label}</div>
      <div className="t-value">{payload[0].value} rit</div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(undefined);
  const [range, setRange] = useState("day");
  const [data, setData] = useState(null);
  const [recap, setRecap] = useState(null);
  const [live, setLive] = useState(false);
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
    } catch (e) { setError(e.message); }
  }, [range]);

  const loadRecap = useCallback(async function () {
    try {
      const rc = await fetch("/api/ritasi", { cache: "no-store" });
      if (rc.ok) { setRecap(await rc.json()); setLive(true); }
    } catch (e) { setLive(false); }
  }, []);

  useEffect(function () {
    if (!authUser) return;
    load(); loadRecap();
    let es = null;
    try {
      es = new EventSource("/api/realtime");
      es.onmessage = function (ev) {
        try { const d = JSON.parse(ev.data); if (d.recap) { setRecap(d.recap); setLive(true); } } catch (e) {}
      };
      es.onerror = function () { setLive(false); };
    } catch (e) {}
    const t = setInterval(function () { load(); loadRecap(); }, 15000);
    return function () { clearInterval(t); try { es && es.close(); } catch (e) {} };
  }, [authUser, load, loadRecap]);

  const stats = useMemo(function () {
    if (!data) return null;
    const buckets = data.bucketSeries || [];
    const last = buckets.length ? buckets[buckets.length - 1].total : 0;
    const prev = buckets.length > 1 ? buckets[buckets.length - 2].total : 0;
    const delta = prev > 0 ? Math.round(((last - prev) / prev) * 100) : (last > 0 ? 100 : 0);
    const units = data.unitSeries || [];
    const productive = units.filter(function (u) { return u.total > 0; }).length;
    const topUnit = units.length ? units.slice().sort(function (a, b) { return b.total - a.total; })[0] : null;
    const mats = (data.materialSeries || []).filter(function (m) { return m.total > 0; });
    const topMat = mats.length ? mats.slice().sort(function (a, b) { return b.total - a.total; })[0] : null;
    const hours = data.hourlySeries || [];
    const peak = hours.length ? hours.slice().sort(function (a, b) { return b.total - a.total; })[0] : null;
    const avg = buckets.length ? Math.round(data.grandTotal / buckets.length) : 0;
    return { buckets, last, prev, delta, units, productive, topUnit, topMat, peak, avg };
  }, [data]);

  if (authUser === undefined) return <div className="container"><div className="card"><div className="hint">Memuat...</div></div></div>;
  if (!authUser) return null;

  const radarData = (data ? data.materialSeries : []).filter(function (m) { return m.total > 0; }).map(function (m) { return { m: m.name, v: m.total }; });
  const exportHref = recap && recap.shift ? "/api/shift/export?shiftId=" + recap.shift.id : "/api/shift/export";

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }

  return (
    <div className="v4-page" style={{ paddingLeft: 0 }}>
      <div className="dash">
        <Rail authUser={authUser} active="dashboard" onLogout={logout} />

        {/* ===== Kolom utama ===== */}
        <main className="dash-main">
          <div className="dash-head">
            <div className="grow">
              <h1>Dashboard Analitik</h1>
              <div className="sub">{recap && recap.shift ? recap.shift.label : "Memuat shift..."} · {authUser.username}</div>
            </div>
            <span className="live-pill"><span className={"live-dot" + (live ? "" : " off")} />{live ? "LIVE" : "SYNC"}</span>
          </div>

          {error && <div className="dash-card"><div className="hint" style={{ color: "var(--bad)" }}>Error: {error}</div></div>}

          <div className="dash-kpis">
            <div className="dash-kpi hero">
              <div className="k-label">Total Rit Periode</div>
              <div className="k-value">{data ? data.grandTotal : "-"}</div>
              {stats && <span className={"k-badge " + (stats.delta < 0 ? "down" : "up")}>{stats.delta < 0 ? "▼" : "▲"} {Math.abs(stats.delta)}%</span>}
              <div className="k-spark">
                <ResponsiveContainer width="100%" height={56}>
                  <AreaChart data={stats ? stats.buckets : []} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <Area type="monotone" dataKey="total" stroke={TEAL_LIGHT} strokeWidth={2} fill={TEAL_LIGHT} fillOpacity={0.25} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="dash-kpi">
              <div className="k-label">Unit Produktif</div>
              <div className="k-value">{stats ? stats.productive : "-"}</div>
              <div className="k-sub">dari {stats ? stats.units.length : "-"} unit terdaftar</div>
            </div>
            <div className="dash-kpi">
              <div className="k-label">Rata-rata</div>
              <div className="k-value">{stats ? stats.avg : "-"}</div>
              <div className="k-sub">rit per {range === "day" ? "hari" : "shift"}</div>
            </div>
            <div className="dash-kpi">
              <div className="k-label">Shift Berjalan</div>
              <div className="k-value">{recap ? recap.grandTotal : "-"}</div>
              <div className="k-sub">jam {recap ? String(recap.currentHour).padStart(2, "0") + ":00" : "--"}</div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-chart-head">
              <div className="grow">
                <h3>Ritasi overview</h3>
                <div className="c-sub">{range === "day" ? "7 hari terakhir" : "10 shift terakhir"}</div>
              </div>
              <div className="dash-tabs">
                <button className={range === "day" ? "active" : ""} onClick={function () { setRange("day"); }}>Hari</button>
                <button className={range === "shift" ? "active" : ""} onClick={function () { setRange("shift"); }}>Shift</button>
              </div>
              <a className="btn btn-secondary dash-export" href={exportHref} target="_blank" rel="noreferrer">↓ Export</a>
            </div>
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={stats ? stats.buckets : []} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="total" stroke={TEAL} strokeWidth={2.5} fill={TEAL} fillOpacity={0.12} dot={false} activeDot={{ r: 4, fill: TEAL, stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-minis">
            <div className="dash-mini">
              <div className="mini-top"><span className="mini-ico" style={{ background: TEAL }}>U</span><span className="mini-label">Top Unit</span></div>
              <div className="mini-value">{stats && stats.topUnit ? stats.topUnit.name : "-"}</div>
              <div className="mini-sub">{stats && stats.topUnit ? stats.topUnit.total + " rit" : "belum ada data"}</div>
            </div>
            <div className="dash-mini">
              <div className="mini-top"><span className="mini-ico" style={{ background: stats && stats.topMat ? (MAT_COLORS[stats.topMat.name] || AMBER) : AMBER }}>M</span><span className="mini-label">Top Material</span></div>
              <div className="mini-value">{stats && stats.topMat ? stats.topMat.name : "-"}</div>
              <div className="mini-sub">{stats && stats.topMat ? stats.topMat.total + " rit" : "belum ada data"}</div>
            </div>
            <div className="dash-mini">
              <div className="mini-top"><span className="mini-ico" style={{ background: "#44403c" }}>J</span><span className="mini-label">Jam Tersibuk</span></div>
              <div className="mini-value">{stats && stats.peak ? String(stats.peak.hour).padStart(2, "0") + ":00" : "-"}</div>
              <div className="mini-sub">{stats && stats.peak ? stats.peak.total + " rit" : "belum ada data"}</div>
            </div>
            <div className="dash-mini">
              <div className="mini-top"><span className="mini-ico" style={{ background: AMBER }}>S</span><span className="mini-label">Status Shift</span></div>
              <div className="mini-value" style={{ fontSize: 15 }}>{recap && recap.shift ? (recap.shift.review_status === "approved" ? "Approved" : "Berjalan") : "-"}</div>
              <div className="mini-sub">{recap && recap.shift ? recap.shift.label : ""}</div>
            </div>
          </div>
        </main>

        {/* ===== Panel kanan ===== */}
        <aside className="dash-side">
          <div className="dash-card">
            <div className="dash-chart-head"><div className="grow"><h3>Komposisi material</h3><div className="c-sub">periode ini</div></div></div>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={225}>
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke={GRID} />
                  <PolarAngleAxis dataKey="m" tick={{ fontSize: 11, fill: TICK, fontWeight: 700 }} />
                  <Radar dataKey="v" stroke={TEAL} strokeWidth={2} fill={TEAL} fillOpacity={0.22} dot={{ r: 3, fill: TEAL, strokeWidth: 0 }} />
                  <Tooltip content={<ChartTip labelPrefix="Material " />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="hint">Belum ada data material.</div>}
          </div>

          <div className="dash-card">
            <div className="dash-chart-head"><div className="grow"><h3>Statistics</h3><div className="c-sub">live shift berjalan</div></div></div>
            <div className="stat-rowline">
              <Ring pct={stats && stats.units.length ? stats.productive / stats.units.length : 0} color={TEAL} size={52} />
              <div className="grow"><div className="stat-name">Unit Aktif</div><div className="stat-sub">berproduksi shift ini</div></div>
              <div><div className="stat-max">MAX {stats ? stats.units.length : "-"}</div><div className="stat-num">{stats ? stats.productive : "-"}</div></div>
            </div>
            <div className="stat-rowline">
              <Ring pct={stats && stats.topMat && data.grandTotal ? stats.topMat.total / data.grandTotal : 0} color={AMBER} size={52} />
              <div className="grow"><div className="stat-name">{stats && stats.topMat ? stats.topMat.name : "Top Material"}</div><div className="stat-sub">porsi terbesar</div></div>
              <div><div className="stat-max">MAX {data ? data.grandTotal : "-"}</div><div className="stat-num">{stats && stats.topMat ? stats.topMat.total : "-"}</div></div>
            </div>
            <div className="stat-rowline">
              <div className="grow"><div className="stat-name">Total Shift Ini</div><div className="stat-sub">semua unit + material</div></div>
              <div className="stat-num">{recap ? recap.grandTotal : "-"} <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font)" }}>rit</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
