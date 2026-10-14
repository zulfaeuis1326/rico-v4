import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { atLeast } from "../../lib/roles";
import Combobox from "../../components/Combobox";
import AdminShell from "../../components/AdminShell";

export default function KelolaFleet() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(undefined);
  const [fleets, setFleets] = useState([]);
  const [units, setUnits] = useState([]);
  const [pits, setPits] = useState([]);
  const [error, setError] = useState(null);

  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [draftFleetId, setDraftFleetId] = useState("");
  const [draftPitId, setDraftPitId] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const [showAddPit, setShowAddPit] = useState(false);
  const [showAddPc, setShowAddPc] = useState(false);
  const [newPitName, setNewPitName] = useState("");
  const [newFleetName, setNewFleetName] = useState("");
  const [newFleetPit, setNewFleetPit] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => {
        if (!d.user) router.push("/login");
        else if (!atLeast(d.user.role, "pengawas")) router.push("/");
        else setAuthUser(d.user);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const loadAll = useCallback(async () => {
    try {
      const [fRes, uRes, pRes] = await Promise.all([
        fetch("/api/fleets"),
        fetch("/api/units"),
        fetch("/api/pits"),
      ]);
      if (fRes.ok) setFleets(await fRes.json());
      if (uRes.ok) setUnits(await uRes.json());
      if (pRes.ok) setPits(await pRes.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (authUser) loadAll();
  }, [authUser, loadAll]);

  useEffect(() => {
    const u = units.find((x) => String(x.id) === selectedUnitId) || null;
    setDraftFleetId(u && u.fleet_id ? String(u.fleet_id) : "");
    setDraftPitId(u && u.pit_id ? String(u.pit_id) : "");
    setSavedMsg(false);
  }, [selectedUnitId, units]);

  async function handleAddPit(e) {
    e.preventDefault();
    if (!newPitName.trim()) return;
    try {
      const res = await fetch("/api/pits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPitName.trim() }),
      });
      if (res.ok) {
        setNewPitName("");
        setShowAddPit(false);
        await loadAll();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(`Gagal tambah lokasi: ${d.error || res.status}`);
      }
    } catch (err) {
      alert(`Gagal tambah lokasi (koneksi/server bermasalah): ${err.message}`);
    }
  }

  async function handleAddFleet(e) {
    e.preventDefault();
    if (!newFleetName.trim()) return;
    try {
      const res = await fetch("/api/fleets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFleetName.trim(), pitId: newFleetPit || null }),
      });
      if (res.ok) {
        setNewFleetName("");
        setNewFleetPit("");
        setShowAddPc(false);
        await loadAll();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(`Gagal tambah PC: ${d.error || res.status}`);
      }
    } catch (err) {
      alert(`Gagal tambah PC (koneksi/server bermasalah): ${err.message}`);
    }
  }

  async function handleAssignFleet(unitId, fleetId) {
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign_fleet", unitId, fleetId: fleetId || null }),
      });
      if (res.ok) await loadAll();
      else {
        const d = await res.json().catch(() => ({}));
        alert(`Gagal assign PC: ${d.error || res.status}`);
      }
    } catch (err) {
      alert(`Gagal assign PC (koneksi/server bermasalah): ${err.message}`);
    }
  }

  async function handleSetUnitPit(unitId, pitId) {
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_pit", unitId, pitId: pitId || null }),
      });
      if (res.ok) await loadAll();
      else {
        const d = await res.json().catch(() => ({}));
        alert(`Gagal ubah lokasi: ${d.error || res.status}`);
      }
    } catch (err) {
      alert(`Gagal ubah lokasi (koneksi/server bermasalah): ${err.message}`);
    }
  }

  async function handleSaveAssign() {
    if (!selectedUnit) return;
    setSavingAssign(true);
    setSavedMsg(false);
    try {
      const fleetChanged = draftFleetId !== (selectedUnit.fleet_id ? String(selectedUnit.fleet_id) : "");
      const pitChanged = draftPitId !== (selectedUnit.pit_id ? String(selectedUnit.pit_id) : "");
      if (fleetChanged) await handleAssignFleet(selectedUnit.id, draftFleetId);
      if (pitChanged) await handleSetUnitPit(selectedUnit.id, draftPitId);
      setSavedMsg(true);
    } finally {
      setSavingAssign(false);
    }
  }

  if (authUser === undefined || authUser === null) {
    return (
      <div className="container">
        <div className="card"><div className="hint">Memuat...</div></div>
      </div>
    );
  }

  const unitOptions = units.map((u) => ({
    value: String(u.id),
    label: `${u.name}${u.fleet_name ? " → " + u.fleet_name : ""}${u.pit_name ? " (" + u.pit_name + ")" : ""}`,
  }));
  const fleetOptions = fleets.map((f) => ({ value: String(f.id), label: f.name }));
  const pitOptions = pits.map((p) => ({ value: String(p.id), label: p.name }));

  const selectedUnit = units.find((u) => String(u.id) === selectedUnitId) || null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const q = search.trim().toLowerCase();
  const groups = fleets.map(function (f) {
    const members = units.filter(function (u) {
      if (String(u.fleet_id) !== String(f.id)) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || (u.pit_name || "").toLowerCase().includes(q);
    });
    return { fleet: f, members };
  });
  const unassigned = units.filter(function (u) {
    if (u.fleet_id) return false;
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || (u.pit_name || "").toLowerCase().includes(q);
  });

  return (
    <AdminShell
      authUser={authUser}
      active="fleet"
      title="Kelola Fleet"
      subtitle="Assign unit HD ke PC/Loader dan lokasi PIT"
      onLogout={handleLogout}
      actions={
        <div className="hero-meta" style={{ marginTop: 0 }}>
          <span className="hero-chip"><b>{fleets.length}</b> Fleet</span>
          <span className="hero-chip"><b>{units.length}</b> Unit</span>
          <span className="hero-chip"><b>{pits.length}</b> PIT</span>
        </div>
      }
    >
      {error && (
        <div className="dash-card"><div className="hint" style={{ color: "var(--bad)" }}>Error: {error}</div></div>
      )}

      <div className="dash-card">
        <h3>Assign Unit</h3>
        <div className="c-sub">Pilih unit, lalu tentukan PC dan PIT-nya.</div>
        <div className="field-label" style={{ margin: "12px 0 6px" }}>Unit</div>
        <Combobox
          value={selectedUnitId}
          onChange={setSelectedUnitId}
          options={unitOptions}
          placeholder="Cari unit, misal H572..."
        />

        {selectedUnit && (
          <div className="fleet-detail-panel">
            <div className="fleet-detail-title">{selectedUnit.name}</div>
            <div className="chip-row" style={{ margin: "6px 0 12px" }}>
              <span className="fleet-badge">{selectedUnit.fleet_name || "Tanpa Fleet"}</span>
              <span className="pit-badge">{selectedUnit.pit_name || "Tanpa PIT"}</span>
            </div>

            <div className="field-label" style={{ marginBottom: 6 }}>Masuk PC (Fleet)</div>
            <Combobox
              value={draftFleetId}
              onChange={setDraftFleetId}
              options={fleetOptions}
              placeholder="Cari PC, misal E520..."
              emptyLabel="-- Belum gabung PC --"
            />

            <div className="field-label" style={{ marginBottom: 6, marginTop: 12 }}>Lokasi (PIT)</div>
            <Combobox
              value={draftPitId}
              onChange={setDraftPitId}
              options={pitOptions}
              placeholder="Cari lokasi..."
              emptyLabel="-- Belum ada lokasi --"
            />

            <button
              className="btn btn-primary"
              style={{ marginTop: 14, width: "auto", padding: "10px 26px" }}
              onClick={handleSaveAssign}
              disabled={savingAssign}
            >
              {savingAssign ? "Menyimpan..." : "Simpan"}
            </button>
            {savedMsg && !savingAssign && (
              <div className="hint" style={{ color: "var(--ok)", marginTop: 8 }}>Tersimpan ✓</div>
            )}
          </div>
        )}
      </div>

      <div className="dash-card">
        <div className="dash-chart-head">
          <div className="grow">
            <h3>Daftar Fleet</h3>
            <div className="c-sub">unit per PC/Loader beserta lokasinya.</div>
          </div>
        </div>
        <div className="rekap-tools">
          <input className="rekap-search" value={search} onChange={function (e) { setSearch(e.target.value); }} placeholder="Cari unit / fleet / PIT..." />
        </div>
        {groups.map(function (g) {
          if (q && g.members.length === 0) return null;
          return (
            <div key={g.fleet.id} className="fleet-group">
              <div className="fleet-group-head" style={{ cursor: "default" }}>
                <span className="fleet-badge">{g.fleet.name}</span>
                <span className="pit-badge">{g.fleet.pit_name || pits.find(function (p) { return String(p.id) === String(g.fleet.pit_id); })?.name || "Tanpa PIT"}</span>
                <span style={{ marginLeft: "auto" }}>{g.members.length} unit</span>
              </div>
              {g.members.length > 0 && (
                <div className="chip-row" style={{ padding: "10px 12px" }}>
                  {g.members.map(function (u) {
                    return <span key={u.id} className="chip">{u.name}{u.pit_name ? " · " + u.pit_name : ""}</span>;
                  })}
                </div>
              )}
            </div>
          );
        })}
        {unassigned.length > 0 && (
          <div className="fleet-group">
            <div className="fleet-group-head" style={{ cursor: "default" }}>
              <span className="fleet-badge" style={{ background: "var(--muted)" }}>Tanpa Fleet</span>
              <span style={{ marginLeft: "auto" }}>{unassigned.length} unit</span>
            </div>
            <div className="chip-row" style={{ padding: "10px 12px" }}>
              {unassigned.map(function (u) {
                return <span key={u.id} className="chip">{u.name}{u.pit_name ? " · " + u.pit_name : ""}</span>;
              })}
            </div>
          </div>
        )}
      </div>

      <div className="two-col-cards">
        <div className="dash-card">
          <button className="add-toggle-btn" onClick={() => setShowAddPc(!showAddPc)}>
            <span>+ Tambah PC / Loader</span>
            <span className={"add-toggle-chevron" + (showAddPc ? " open" : "")}>▾</span>
          </button>
          {showAddPc && (
            <form onSubmit={handleAddFleet} className="add-form">
              <div className="field-label" style={{ marginBottom: 6 }}>Nama PC</div>
              <input
                className="field-input"
                value={newFleetName}
                onChange={(e) => setNewFleetName(e.target.value)}
                placeholder="Contoh: E52099"
                style={{ marginBottom: 12 }}
              />
              <div className="field-label" style={{ marginBottom: 6 }}>Lokasi (PIT)</div>
              <Combobox
                value={newFleetPit}
                onChange={setNewFleetPit}
                options={pitOptions}
                placeholder="Cari lokasi..."
                emptyLabel="-- Tanpa lokasi dulu --"
              />
              <button className="btn btn-primary" style={{ marginTop: 12 }}>Simpan PC</button>
            </form>
          )}
        </div>

        <div className="dash-card">
          <button className="add-toggle-btn" onClick={() => setShowAddPit(!showAddPit)}>
            <span>+ Tambah Lokasi (PIT)</span>
            <span className={"add-toggle-chevron" + (showAddPit ? " open" : "")}>▾</span>
          </button>
          {showAddPit && (
            <form onSubmit={handleAddPit} className="add-form">
              <input
                className="field-input"
                value={newPitName}
                onChange={(e) => setNewPitName(e.target.value)}
                placeholder="Contoh: PIT BARU"
                style={{ marginBottom: 12 }}
              />
              <button className="btn btn-primary">Simpan Lokasi</button>
            </form>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
