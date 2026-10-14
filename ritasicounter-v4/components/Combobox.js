import { useEffect, useMemo, useRef, useState } from "react";

// Combobox V4 — tap untuk buka panel search + list (pengganti <select> native).
// Props: value, onChange(value), options [{value,label}], placeholder, emptyLabel
export default function Combobox({ value, onChange, options, placeholder, emptyLabel }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);
  const list = options || [];

  const selected = useMemo(function () {
    return list.find(function (o) { return String(o.value) === String(value); }) || null;
  }, [list, value]);

  const filtered = useMemo(function () {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(function (o) { return String(o.label).toLowerCase().includes(s); });
  }, [list, q]);

  useEffect(function () {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return function () { document.removeEventListener("mousedown", onDoc); };
  }, [open ]);

  return (
    <div className="combo-wrap" ref={wrapRef}>
      <button
        type="button"
        className="combo-btn"
        onClick={function () { setOpen(function (v) { return !v; }); setQ(""); }}
      >
        {selected ? selected.label : (<span style={{ color: "var(--muted)", fontWeight: 500 }}>{placeholder || "Pilih..."}</span>)}
        <span className="combo-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="combo-panel">
          <div style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
            <input autoFocus value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Ketik untuk cari..." />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.map(function (o) {
              const sel = String(o.value) === String(value);
              return (
                <div
                  key={o.value}
                  className="combo-item"
                  style={sel ? { background: "var(--aso)", color: "var(--accent)" } : null}
                  onClick={function () { onChange(o.value); setOpen(false); }}
                >
                  {o.label}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="combo-item" style={{ color: "var(--muted)", cursor: "default" }}>
                {emptyLabel || "Tidak ketemu."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
