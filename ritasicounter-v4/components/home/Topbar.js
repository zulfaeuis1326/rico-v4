import { useEffect, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { ROLE_LABEL } from "../../lib/roles";

function icon(path) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

export default function Topbar({ authUser, canMonitorAll, isAdmin, isOperator, onLogout, currentPage, live, clock }) {
  const [theme, toggleTheme] = useTheme();
  const page = currentPage || "input-ritasi";
  const homeLabel = isOperator ? "Input Ritasi" : "Monitoring";

  function Item({ id, href, label, show, d }) {
    if (show === false) return null;
    const cur = page === id;
    const c = cur ? "topbar-nav-current" : "";
    const inner = (<><span className="topbar-nav-icon">{icon(d)}</span><span>{label}</span></>);
    if (cur) return <span className={c} title={label}>{inner}</span>;
    return <a href={href} title={label}>{inner}</a>;
  }

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span className="topbar-mark">
          <img src="/logo.png" alt="Logo" className="topbar-mark-img" onError={function (e) { e.target.style.display = "none"; }} />
        </span>
        <span>
          <span className="topbar-logo-text">RitasiCounter <span style={{ color: "var(--accent)" }}>V4</span></span>
          <div className="topbar-sub" style={{ fontSize: 11, color: "var(--muted)" }}>Mining Hauler Realtime</div>
        </span>
      </div>
      <nav className="topbar-nav">
        <Item id="input-ritasi" href="/" label={homeLabel} d={<><path d="M12 12l9 3-4 2-2 4-3-9z" /><path d="M9 3v3M3 9h3" /></>} />
        <Item id="dashboard" href="/dashboard" label="Dashboard" show={canMonitorAll} d={<><line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="12" width="3" height="8" /><rect x="11" y="4" width="3" height="16" /></>} />
        <Item id="display" href="/display" label="Live TV" show={canMonitorAll} d={<><rect x="2" y="4" width="20" height="13" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /></>} />
        <Item id="fleet" href="/admin/fleet" label="Fleet" show={canMonitorAll} d={<><rect x="1" y="7" width="13" height="10" /><path d="M14 10h4l4 4v3h-8z" /></>} />
        <Item id="akun" href="/admin/operators" label="Akun" show={isAdmin} d={<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /></>} />
      </nav>
      <div className="topbar-spacer" />
      {typeof live !== "undefined" && (
        <span className="live-pill" title={live ? "Realtime tersambung" : "Menghubungkan ulang..."}>
          <span className={"live-dot" + (live ? "" : " off")} />
          {live ? "LIVE" : "SYNC"}
          {clock ? " · " + clock : ""}
        </span>
      )}
      <div className="topbar-footer">
        <span className="topbar-role-badge">{(ROLE_LABEL[authUser.role] || authUser.role).toUpperCase()}</span>
        {theme !== null && (
          <button className="topbar-iconbtn" onClick={toggleTheme} title="Ganti tema">{theme === "dark" ? "☀" : "☾"}</button>
        )}
        <button className="topbar-iconbtn" onClick={onLogout} title="Logout">⏻</button>
        <div className="topbar-avatar">{authUser.username.charAt(0).toUpperCase()}</div>
      </div>
    </header>
  );
}
