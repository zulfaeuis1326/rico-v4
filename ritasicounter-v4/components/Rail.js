import { atLeast } from "../lib/roles";
import { useTheme } from "../hooks/useTheme";

function Ico({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
}

// Rel navigasi ikon ala dashboard. active: "input" | "dashboard" | "display" | "fleet" | "akun"
export default function Rail({ authUser, active, onLogout }) {
  const [theme, toggleTheme] = useTheme();
  const isAdmin = atLeast(authUser.role, "admin");
  const canMonitor = atLeast(authUser.role, "pengawas");
  const homeLabel = authUser.role === "operator" ? "Input Ritasi" : "Monitoring";

  function Btn({ id, href, label, onClick, children }) {
    const cls = "rail-btn" + (active === id ? " active" : "");
    if (href) return <a className={cls} href={href} title={label}>{children}</a>;
    return <button className="rail-btn" title={label} onClick={onClick}>{children}</button>;
  }

  return (
    <nav className="dash-rail">
      <span className="rail-mark">R</span>
      <Btn id="input" href="/" label={homeLabel}>
        <Ico d={<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>} />
      </Btn>
      {canMonitor && (
        <Btn id="dashboard" href="/dashboard" label="Dashboard">
          <Ico d={<><line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="13" width="3" height="7" /><rect x="11" y="5" width="3" height="15" /><rect x="16" y="9" width="3" height="11" /></>} />
        </Btn>
      )}
      {canMonitor && (
        <Btn id="display" href="/display" label="Live TV">
          <Ico d={<><rect x="2" y="4" width="20" height="13" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>} />
        </Btn>
      )}
      {canMonitor && (
        <Btn id="fleet" href="/admin/fleet" label="Kelola Fleet">
          <Ico d={<><rect x="1" y="7" width="13" height="10" /><path d="M14 10h4l4 4v3h-8z" /><circle cx="6" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></>} />
        </Btn>
      )}
      {isAdmin && (
        <Btn id="akun" href="/admin/operators" label="Kelola Akun">
          <Ico d={<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /></>} />
        </Btn>
      )}
      <span className="rail-spacer" />
      {theme !== null && (
        <Btn label="Ganti tema" onClick={toggleTheme}>
          <span style={{ fontSize: 16 }}>{theme === "dark" ? "☀" : "☾"}</span>
        </Btn>
      )}
      <Btn label="Logout" onClick={onLogout}>
        <Ico d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>} />
      </Btn>
      <span className="rail-avatar" title={authUser.username}>{authUser.username.charAt(0).toUpperCase()}</span>
    </nav>
  );
}
