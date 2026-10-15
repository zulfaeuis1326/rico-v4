import { useState, useEffect } from "react";
import { apiJson } from "../lib/apiClient";
import Combobox from "../components/Combobox";
import AuthDots from "../components/AuthDots";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const ROLE_OPTIONS = [
  { value: "operator", label: "Operator — input ritasi per unit" },
  { value: "pengawas", label: "Pengawas — monitoring & approval" },
  { value: "admin", label: "Admin — kelola unit & akun" },
  { value: "superadmin", label: "Superadmin — kontrol penuh" },
];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("operator");
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(function () {
    fetch("/api/units")
      .then(function (res) { return res.json(); })
      .then(function (data) { if (Array.isArray(data)) setUnits(data); })
      .catch(function () {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (role === "operator" && !unitId && !newUnitName.trim()) {
      setError("Operator wajib pilih nomor unit atau ketik unit baru.");
      return;
    }
    setLoading(true);
    try {
      await apiJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          role,
          unitId: role === "operator" ? unitId || undefined : undefined,
          newUnitName: role === "operator" ? newUnitName.trim() || undefined : undefined,
        }),
      });
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <AuthDots />
      <div className="auth-card">
        <img src="/logo.png" alt="Logo perusahaan" className="auth-logo" onError={function (e) { e.target.style.display = "none"; }} />
        <div className="auth-title">RitasiCounter</div>
        <div className="auth-subtitle">Masuk sesuai peran kamu</div>

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="field-input"
              value={username}
              onChange={function (e) { setUsername(e.target.value); }}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="cth. operator01"
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="password">Password</label>
            <div className="field-password-wrap">
              <input
                id="password"
                className="field-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={function (e) { setPassword(e.target.value); }}
                autoComplete="current-password"
                placeholder="Password kamu"
              />
              <button
                type="button"
                className="field-password-toggle"
                onClick={function () { setShowPassword(!showPassword); }}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="role">Masuk sebagai</label>
            <select
              id="role"
              className="field-input"
              value={role}
              onChange={function (e) { setRole(e.target.value); setUnitId(""); setNewUnitName(""); }}
            >
              {ROLE_OPTIONS.map(function (o) {
                return <option key={o.value} value={o.value}>{o.label}</option>;
              })}
            </select>
          </div>

          {role === "operator" && (
            <div className="field-group">
              <label className="field-label">Nomor Unit</label>
              <Combobox
                value={unitId}
                onChange={function (v) { setUnitId(v || ""); }}
                options={units.map(function (u) { return { value: String(u.id), label: u.name }; })}
                placeholder="Cari nomor unit, misal HD-07..."
                emptyLabel={units.length === 0 ? "Belum ada unit terdaftar" : null}
              />
              <input
                className="field-input"
                value={newUnitName}
                onChange={function (e) { setNewUnitName(e.target.value); }}
                placeholder="Atau ketik unit baru"
                style={{ marginTop: 8 }}
              />
              <div className="hint" style={{ marginTop: 6 }}>Unit mengunci sesi kerja kamu sampai logout.</div>
            </div>
          )}

          {error && <div className="field-error" role="alert">{error}</div>}

          <button className="auth-submit" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="auth-switch">
          Belum punya akun? <a href="/register">Daftar di sini</a>
        </div>
      </div>
      <div className="app-footer">designed by Najib.dev</div>
    </div>
  );
}
