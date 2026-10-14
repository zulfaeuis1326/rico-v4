import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { atLeast } from "../lib/roles";
import { ToastProvider, useToast } from "../components/Toast";
import { apiJson } from "../lib/apiClient";
import Topbar from "../components/home/Topbar";
import Combobox from "../components/Combobox";
import JamManualModal from "../components/home/JamManualModal";
import UnitSetupScreen from "../components/home/UnitSetupScreen";

const MATERIALS = ["OB", "COAL", "SOIL", "SOLU", "MUD"];
const MAT_COLOR = { OB: "#9a6b1f", COAL: "#44403c", SOIL: "#c2701d", SOLU: "#0e7490", MUD: "#6d7c2f" };

function fmtCell(h) {
  if (!h || h.total === 0) return "-";
  const e = Object.entries(h.materials || {});
  if (e.length === 1) return e[0][0] + " x" + e[0][1];
  return e.map(function (x) { return x[0] + ":" + x[1]; }).join(", ");
}

export default function Home() {
  return (<ToastProvider><HomeContent /></ToastProvider>);
}

function HomeContent() {
  const router = useRouter();
  const toast = useToast();
  const [authUser, setAuthUser] = useState(undefined);
  const [clock, setClock] = useState("");
  const [units, setUnits] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [pits, setPits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [material, setMaterial] = useState("");
  const [selectedJam, setSelectedJam] = useState("");
  const [jamOpen, setJamOpen] = useState(false);
  const [recap, setRecap] = useState(null);
  const [history, setHistory] = useState([]);
  const [pastShifts, setPastShifts] = useState([]);
  const [live, setLive] = useState(false);
  const [loadingClick, setLoadingClick] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [pitFilter, setPitFilter] = useState("");
  const [collapsedFleet, setCollapsedFleet] = useState({});
  const [reportHours, setReportHours] = useState([7, 12, 19]);
  const [setupUnits, setSetupUnits] = useState([]);

  const isAdmin = !!authUser && atLeast(authUser.role, "admin");
  const isOperator = !!authUser && authUser.role === "operator";
  const canMonitor = !!authUser && atLeast(authUser.role, "pengawas");
  const canClick = !!authUser && (isOperator || isAdmin);
  const needsSetup = isOperator && !authUser.unit_id;

  useEffect(function () {
    if (isOperator && authUser && authUser.unit_id && !selectedUnit) setSelectedUnit(String(authUser.unit_id));
  }, [isOperator, authUser, selectedUnit]);

  useEffect(function () {
    fetch("/api/auth/me", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.user) router.push("/login"); else setAuthUser(d.user);
    }).catch(function () { router.push("/login"); });
  }, [router]);

  useEffect(function () {
    function tick() { setClock(new Date().toLocaleTimeString("id-ID", { hour12: false })); }
    tick(); const t = setInterval(tick, 1000); return function () { clearInterval(t); };
  }, []);

  const loadUnits = useCallback(async function () {
    try { const r = await fetch("/api/units"); if (r.ok) setUnits(await r.json()); } catch (e) {}
  }, []);
  const loadMeta = useCallback(async function () {
    try {
      const f = await fetch("/api/fleets"); if (f.ok) setFleets(await f.json());
      const p = await fetch("/api/pits"); if (p.ok) setPits(await p.json());
      const s = await fetch("/api/settings"); if (s.ok) { const d = await s.json(); if (d && Array.isArray(d.reportHours)) setReportHours(d.reportHours); }
      const l = await fetch("/api/shift/list"); if (l.ok) setPastShifts(await l.json());
    } catch (e) {}
  }, []);
  const loadHistory = useCallback(async function () {
    try { const r = await fetch("/api/ritasi/history"); if (r.ok) { const d = await r.json(); setHistory(d.clicks || []); } } catch (e) {}
  }, []);

  // Realtime SSE + fallback polling
  useEffect(function () {
    if (!authUser || needsSetup) return;
    let stop = false; let poll = null; let es = null;
    async function pollOnce() {
      try {
        const r = await fetch("/api/ritasi", { cache: "no-store" });
        if (r.ok && !stop) setRecap(await r.json());
        const h = await fetch("/api/ritasi/history", { cache: "no-store" });
        if (h.ok && !stop) { const d = await h.json(); setHistory(d.clicks || []); }
      } catch (e) {}
    }
    pollOnce(); loadHistory();
    try {
      es = new EventSource("/api/realtime");
      es.onmessage = function (ev) {
        if (stop) return;
        try { const d = JSON.parse(ev.data); if (d.recap) { setRecap(d.recap); setLive(true); } } catch (e) {}
      };
      es.onerror = function () {
        setLive(false);
        try { es.close(); } catch (e) {}
        if (!poll) poll = setInterval(pollOnce, 4000);
      };
    } catch (e) { poll = setInterval(pollOnce, 4000); }
    const slow = setInterval(function () { if (!stop && !live) pollOnce(); }, 5000);
    return function () { stop = true; try { es && es.close(); } catch (e) {} if (poll) clearInterval(poll); clearInterval(slow); };
  }, [authUser, needsSetup, live, loadHistory]);

  useEffect(function () {
    if (!authUser || needsSetup) return;
    if (isAdmin) loadUnits(); else { fetch("/api/units").then(function (r) { return r.json(); }).then(setSetupUnits).catch(function () {}); }
    if (canMonitor) loadMeta();
  }, [authUser, needsSetup, isAdmin, canMonitor, loadUnits, loadMeta]);

  async function handleLogout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }

  async function handleClick() {
    if (!selectedUnit) { toast("Pilih unit dulu.", "error"); return; }
    if (!material) { toast("Pilih material dulu.", "error"); return; }
    setLoadingClick(true);
    try {
      const d = await apiJson("/api/ritasi", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: Number(selectedUnit), material, jam: selectedJam === "" ? undefined : Number(selectedJam) }) });
      setRecap(d); setSelectedJam(""); loadHistory(); toast("Ritasi tercatat", "success");
    } catch (e) { toast(e.message || "Koneksi bermasalah", "error"); } finally { setLoadingClick(false); }
  }

  async function handleApprove(approve) {
    try {
      const r = await fetch("/api/shift/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approve }) });
      const d = await r.json();
      if (!r.ok) { toast(d.error || "Gagal", "error"); return; }
      setRecap(function (prev) { return prev ? Object.assign({}, prev, { shift: Object.assign({}, prev.shift, { review_status: d.shift.review_status, reviewed_by: d.shift.reviewed_by }) }) : prev; });
      toast(approve ? "Shift di-approve" : "Approval dibatalkan", "success");
    } catch (e) { toast("Koneksi bermasalah", "error"); }
  }

  async function handleCloseShift() {
    if (!confirm("Tutup shift sekarang?")) return;
    const r = await fetch("/api/shift/close", { method: "POST" });
    if (r.ok) { toast("Shift ditutup", "success"); window.location.reload(); }
    else { const d = await r.json().catch(function () { return {}; }); toast("Gagal: " + (d.error || r.status), "error"); }
  }

  const allUnits = (recap && recap.units) || [];
  const filtered = useMemo(function () {
    let b = showAll ? allUnits : allUnits.filter(function (u) { return u.total > 0; });
    if (pitFilter) b = b.filter(function (u) { return String(u.pit_id) === String(pitFilter) || u.pit_name === pitFilter; });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      b = b.filter(function (u) { return u.name.toLowerCase().includes(q) || (u.fleet_name || "").toLowerCase().includes(q) || (u.pit_name || "").toLowerCase().includes(q); });
    }
    return b;
  }, [allUnits, showAll, search, pitFilter]);

  const fleetGroups = useMemo(function () {
    const m = new Map();
    filtered.forEach(function (u) {
      const k = u.fleet_name || "Tanpa Fleet";
      if (!m.has(k)) m.set(k, { name: k, pit: u.pit_name || "-", total: 0, units: [] });
      const g = m.get(k); g.units.push(u); g.total += u.total;
    });
    return Array.from(m.values()).sort(function (a, b) { return b.total - a.total; });
  }, [filtered]);

  const selRecap = recap && recap.units ? recap.units.find(function (u) { return String(u.id) === String(selectedUnit); }) : null;
  const hourData = selRecap && selRecap.hourly ? selRecap.hourly.find(function (h) { return recap && h.jam === recap.currentHour; }) : null;
  const reviewStatus = recap && recap.shift ? (recap.shift.review_status || "pending") : "pending";

  if (authUser === undefined) return <div className="container"><div className="card"><div className="hint">Memuat...</div></div></div>;
  if (!authUser) return null;
  if (needsSetup) {
    return (<UnitSetupScreen authUser={authUser} setupUnits={setupUnits.length ? setupUnits : units} settingUnit={false}
      newSetupUnitName="" onChangeNewSetupUnitName={function () {}} onSetUnit={async function (id) {
        const r = await fetch("/api/auth/set-unit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitId: id }) });
        if (r.ok) window.location.reload(); else toast("Gagal pilih unit", "error");
      }} onRegisterOwnUnit={function (e) { e.preventDefault(); }} onLogout={handleLogout} />);
  }

  return (
    <div className="v4-page">
      <Topbar authUser={authUser} canMonitorAll={canMonitor} isAdmin={isAdmin} isOperator={isOperator} onLogout={handleLogout} live={live} clock={clock} />
      <main className="container">
        <div className="card hero">
          <div className="shift-banner">
            <div className="grow">
              <div style={{ fontSize: 12, opacity: .85, fontWeight: 700, letterSpacing: ".08em" }}>SHIFT BERJALAN · {clock}</div>
              <div className="clock" style={{ fontSize: 24 }}>{recap && recap.shift ? recap.shift.label : "Memuat shift..."}</div>
              <div style={{ fontSize: 12.5, opacity: .9 }}>Jam aktif: {recap ? String(recap.currentHour).padStart(2, "0") + ":00" : "-"} · {recap ? recap.tzInfo : ""}</div>
            </div>
            <span className={"approve-pill " + reviewStatus}>{reviewStatus === "approved" ? "Approved" : "Pending review"}</span>
          </div>
        </div>

        {canMonitor && (
          <div className="kpi-grid">
            <div className="kpi" style={{ "--kc": "#4f46e5" }}><div className="kpi-label">Total Rit Shift</div><div className="kpi-value">{recap ? recap.grandTotal : 0}</div><div className="kpi-sub">{filtered.length} unit aktif berproduksi</div></div>
            <div className="kpi" style={{ "--kc": "#06b6d4" }}><div className="kpi-label">Jam Berjalan</div><div className="kpi-value">{recap ? String(recap.currentHour).padStart(2, "0") : "--"}</div><div className="kpi-sub">{recap && recap.grandHourlyTotals && recap.hours ? (recap.grandHourlyTotals[recap.hours.indexOf(recap.currentHour)] || 0) + " rit jam ini" : ""}</div></div>
            <div className="kpi" style={{ "--kc": "#16a34a" }}><div className="kpi-label">Fleet Aktif</div><div className="kpi-value">{fleetGroups.length}</div><div className="kpi-sub">{fleets.length} fleet terdaftar</div></div>
            <div className="kpi" style={{ "--kc": "#d97706" }}><div className="kpi-label">Top Material</div><div className="kpi-value" style={{ fontSize: 22 }}>{topMat(recap)}</div><div className="kpi-sub">komposisi shift ini</div></div>
          </div>
        )}

        <div className="v4-grid">
          {canClick && (
            <section className="card">
              <h2 className="sec-title-icon">Klik Ritasi</h2>
              <div className="field-label" style={{ marginBottom: 6 }}>Unit</div>
              {isAdmin ? (
                <Combobox value={selectedUnit} onChange={setSelectedUnit} options={units.map(function (u) { return { value: String(u.id), label: u.name }; })} placeholder="Cari unit..." />
              ) : (
                <div className="hint" style={{ fontSize: 15, color: "var(--text)", marginBottom: 8 }}>Unit kamu: <b>{authUser.unit_name}</b> (terkunci)</div>
              )}
              <div className="field-label" style={{ margin: "12px 0 4px" }}>Material (+1 rit)</div>
              <div className="mat-grid">
                {MATERIALS.map(function (m) {
                  const c = selRecap && selRecap.materialTotals ? (selRecap.materialTotals[m] || 0) : 0;
                  return (<button key={m} className={"mat-btn" + (material === m ? " active" : "")} style={{ "--mc": MAT_COLOR[m] }} onClick={function () { setMaterial(m); }}>
                    <span className="mat-btn-name"><span className="mat-dot" />{m}</span>
                    <span className="mat-btn-cnt">{c} rit</span>
                  </button>);
                })}
              </div>
              <div className="ritasi-jam-row">
                <div><div className="field-label">Jam Ritasi</div>
                  <div className="hint">{selectedJam === "" ? "Sekarang (" + (recap ? String(recap.currentHour).padStart(2, "0") + ":00" : "-") + ")" : String(selectedJam).padStart(2, "0") + ":00 (manual)"}</div>
                </div>
                <button className="btn btn-secondary" style={{ width: "auto", padding: "0 14px" }} onClick={function () { setJamOpen(true); }}>Ubah</button>
              </div>
              <button className="big-click-btn" style={{ marginTop: 14 }} disabled={!selectedUnit || !material || loadingClick} onClick={handleClick}>
                {loadingClick ? "..." : "+ RITASI"}
              </button>
              <div className="stat-row" style={{ marginTop: 12 }}><span>Rit jam ini</span><b>{hourData ? hourData.total : 0}</b></div>
              <div className="stat-row"><span>Total shift (unit ini)</span><b>{selRecap ? selRecap.total : 0}</b></div>
            </section>
          )}

          <div>
            {canMonitor && (
              <section className="card">
                <h2 className="sec-title-icon">Rekap per Fleet ({filtered.length} unit)</h2>
                <div className="rekap-tools">
                  <input className="rekap-search" value={search} onChange={function (e) { setSearch(e.target.value); }} placeholder="Cari unit / fleet / PIT..." />
                  <select value={pitFilter} onChange={function (e) { setPitFilter(e.target.value); }} style={{ width: "auto", minWidth: 130 }}>
                    <option value="">Semua PIT</option>
                    {Array.from(new Set(allUnits.map(function (u) { return u.pit_name || "Tanpa PIT"; }))).map(function (p) {
                      return <option key={p} value={p}>{p}</option>;
                    })}
                  </select>
                  <label className="rekap-toggle"><input type="checkbox" checked={!showAll} onChange={function (e) { setShowAll(!e.target.checked); }} />Hanya ada ritasi</label>
                  <button className="btn btn-secondary rekap-export-btn" onClick={function () { if (recap && recap.shift) window.open("/api/shift/export?shiftId=" + recap.shift.id, "_blank"); }}>Export</button>
                </div>
                {fleetGroups.map(function (g) {
                  const col = !!collapsedFleet[g.name];
                  return (
                    <div key={g.name} className="fleet-group">
                      <div className="fleet-group-head" onClick={function () { setCollapsedFleet(function (p) { const n = Object.assign({}, p); n[g.name] = !n[g.name]; return n; }); }}>
                        <span className="fleet-badge">{g.name}</span>
                        <span className="pit-badge">{g.pit}</span>
                        <span style={{ marginLeft: "auto" }}>{g.total} rit · {g.units.length} unit {col ? "▸" : "▾"}</span>
                      </div>
                      {!col && (
                        <div className="table-scroll" style={{ border: "none", borderTop: "1px solid var(--border)", borderRadius: 0 }}>
                          <table><thead><tr><th>Unit</th>{MATERIALS.map(function (m) { return <th key={m}>{m}</th>; })}<th>Total</th></tr></thead>
                            <tbody>{g.units.map(function (u) {
                              return (<tr key={u.id}><td>{u.name}</td>{MATERIALS.map(function (m) { return <td key={m}>{(u.materialTotals && u.materialTotals[m]) || 0}</td>; })}<td><b>{u.total}</b></td></tr>);
                            })}</tbody></table>
                        </div>
                      )}
                    </div>
                  );
                })}
                {fleetGroups.length === 0 && <div className="hint">Belum ada ritasi di shift ini.</div>}
                <div className="table-scroll" style={{ marginTop: 12 }}>
                  <table><thead><tr><th>Jam</th>{recap && recap.hours ? recap.hours.map(function (h) { return <th key={h} className={h === recap.currentHour ? "current-hour" : ""}>{String(h).padStart(2, "0")}</th>; }) : null}<th>Total</th></tr></thead>
                    <tbody><tr className="total-row"><td>TOTAL</td>{recap && recap.grandHourlyTotals ? recap.grandHourlyTotals.map(function (v, i) { return <td key={i} className={recap.hours[i] === recap.currentHour ? "current-hour" : ""}>{v}</td>; }) : null}<td>{recap ? recap.grandTotal : 0}</td></tr></tbody></table>
                </div>
              </section>
            )}

            {canMonitor && (
              <section className="card">
                <h2 className="sec-title-icon">Shift & Approval</h2>
                <div className="hint" style={{ marginBottom: 10 }}>Approval pengawas bersifat stempel resmi — data tetap masuk rekap walau belum di-approve.</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {reviewStatus === "approved"
                    ? <button className="btn btn-secondary" style={{ width: "auto" }} onClick={function () { handleApprove(false); }}>Batalkan Approval</button>
                    : <button className="btn btn-primary" style={{ width: "auto" }} onClick={function () { handleApprove(true); }}>Approve Shift Ini</button>}
                  <button className="btn btn-danger" style={{ width: "auto" }} onClick={handleCloseShift}>Tutup Shift</button>
                </div>
                {pastShifts.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="field-label" style={{ marginBottom: 6 }}>Riwayat Shift</div>
                    {pastShifts.slice(0, 8).map(function (s) {
                      return (<div key={s.id} className="history-row" style={{ marginBottom: 6 }}>
                        <span>{s.label} {s.review_status === "approved" ? "✓" : ""}</span>
                        <span style={{ display: "flex", gap: 6 }}>
                          <a className="btn-mini-link" href={"/api/shift/export?shiftId=" + s.id} target="_blank" rel="noreferrer">Export</a>
                          {isAdmin && <button className="btn-mini-danger" onClick={async function () {
                            if (!confirm("Hapus shift " + s.label + "?")) return;
                            const r = await fetch("/api/shift/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shiftId: s.id }) });
                            if (r.ok) { setPastShifts(pastShifts.filter(function (x) { return x.id !== s.id; })); toast("Shift dihapus", "success"); }
                          }}>Hapus</button>}
                        </span>
                      </div>);
                    })}
                  </div>
                )}
              </section>
            )}

            <section className="card">
              <h2 className="sec-title-icon">Riwayat ({history.length})</h2>
              {history.length === 0 && <div className="hint">Belum ada ritasi.</div>}
              <div className="history-list-scroll">
                {history.slice(0, 60).map(function (h) {
                  return (<div key={h.id} className="history-row">
                    <div className="history-info"><b>{h.unit_name}</b> · {h.material} · jam {String(h.jam).padStart(2, "0")}:00
                      <span className="history-meta"> — {h.operator_name || "-"}, {new Date(h.clicked_at).toLocaleTimeString("id-ID")}</span></div>
                    {(isAdmin || h.operator_id === authUser.id) && (
                      <button className="btn-mini-danger" onClick={async function () {
                        if (!confirm("Hapus entri ini?")) return;
                        const r = await fetch("/api/ritasi/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id }) });
                        if (r.ok) { const d = await r.json(); if (d.recap) setRecap(d.recap); loadHistory(); }
                      }}>Hapus</button>
                    )}
                  </div>);
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
      <JamManualModal open={jamOpen} onClose={function () { setJamOpen(false); }} shiftType={recap && recap.shift ? recap.shift.shift_type : 1} currentHour={recap ? recap.currentHour : 0} onPick={setSelectedJam} />
      <div className="app-footer">RitasiCounter V4 · realtime SSE · designed by Najib.dev</div>
    </div>
  );
}

function topMat(recap) {
  if (!recap || !recap.grandMaterialTotals) return "-";
  let best = "-"; let n = 0;
  Object.entries(recap.grandMaterialTotals).forEach(function (e) { if (e[1] > n) { n = e[1]; best = e[0]; } });
  return n === 0 ? "-" : best + " " + n;
}
