import { useState } from "react";
import { apiJson } from "../lib/apiClient";

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

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      <aside className="auth-side">
        <div className="auth-side-brand">
          <img src="/logo.png" alt="Logo perusahaan" onError={function (e) { e.target.style.display = "none"; }} />
          <span>RitasiCounter <em>V4</em></span>
        </div>
        <h1>Pencatatan ritasi tambang, realtime.</h1>
        <p>Input per unit dan material, rekap per fleet dan PIT, approval shift, dan dashboard analitik — dalam satu aplikasi.</p>
        <ul className="auth-side-points">
          <li><b>Realtime SSE</b><span>data mengalir otomatis</span></li>
          <li><b>Fleet & PIT</b><span>struktur sesuai lapangan</span></li>
          <li><b>Export Excel</b><span>laporan siap share</span></li>
        </ul>
        <div className="auth-side-foot">designed by Najib.dev</div>
      </aside>

      <main className="auth-main">
        <div className="auth-form-card">
          <h2>Selamat datang kembali</h2>
          <p className="auth-form-sub">Masuk ke akun kamu untuk mulai bekerja.</p>

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

            {error && <div className="field-error" role="alert">{error}</div>}

            <button className="auth-submit" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="auth-switch">
            Belum punya akun? <a href="/register">Daftar di sini</a>
          </div>
        </div>
      </main>
    </div>
  );
}
