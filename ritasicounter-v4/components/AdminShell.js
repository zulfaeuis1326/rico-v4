import Rail from "./Rail";

// Kerangka halaman admin: rel ikon + header + konten, serasi dengan dashboard.
export default function AdminShell({ authUser, active, title, subtitle, actions, onLogout, children }) {
  return (
    <div className="v4-page" style={{ paddingLeft: 0 }}>
      <div className="dash admin">
        <Rail authUser={authUser} active={active} onLogout={onLogout} />
        <main className="dash-main">
          <div className="dash-head">
            <div className="grow">
              <h1>{title}</h1>
              {subtitle && <div className="sub">{subtitle}</div>}
            </div>
            {actions}
          </div>
          {children}
          <div className="app-footer">RitasiCounter V4 · designed by Najib.dev</div>
        </main>
      </div>
    </div>
  );
}
