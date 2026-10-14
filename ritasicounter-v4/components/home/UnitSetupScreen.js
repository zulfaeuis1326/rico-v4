import Combobox from "../Combobox";

export default function UnitSetupScreen({
  authUser,
  setupUnits,
  settingUnit,
  newSetupUnitName,
  onChangeNewSetupUnitName,
  onSetUnit,
  onRegisterOwnUnit,
  onLogout,
}) {
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <img src="/logo.png" alt="Logo perusahaan" className="auth-logo" onError={function (e) { e.target.style.display = "none"; }} />
        <div className="auth-title">Pilih Unit Kamu</div>
        <div className="auth-subtitle">
          Halo <b>{authUser.username}</b> — pilih 1 unit yang akan kamu operasikan. Unit ini
          terkunci sampai kamu logout. Mau ganti unit? Logout dulu, lalu login lagi.
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="setup-unit">Unit</label>
          <Combobox
            value=""
            onChange={function (unitId) { if (unitId && !settingUnit) onSetUnit(unitId); }}
            options={setupUnits.map(function (u) { return { value: String(u.id), label: u.name }; })}
            placeholder="Cari unit kamu..."
            emptyLabel={setupUnits.length === 0 ? "Belum ada unit terdaftar" : null}
          />
          {settingUnit && <div className="hint" style={{ marginTop: 8 }}>Menyimpan pilihan unit...</div>}
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="setup-new-unit">Nomor unit tidak ada di atas?</label>
          <form onSubmit={onRegisterOwnUnit} style={{ display: "flex", gap: 8 }}>
            <input
              id="setup-new-unit"
              value={newSetupUnitName}
              onChange={function (e) { onChangeNewSetupUnitName(e.target.value); }}
              placeholder="Contoh: HD-07"
              style={{ flex: 1 }}
              disabled={settingUnit}
            />
            <button className="btn btn-secondary" style={{ width: "auto", padding: "0 16px" }} disabled={settingUnit}>
              Daftarkan
            </button>
          </form>
          <div className="hint" style={{ marginTop: 6 }}>Ketik nomor unit kamu sendiri kalau belum ada di daftar.</div>
        </div>
        <button className="btn-mini-danger" onClick={onLogout}>Logout</button>
      </div>
      <div className="app-footer">RitasiCounter V4 · designed by Najib.dev</div>
    </div>
  );
}
