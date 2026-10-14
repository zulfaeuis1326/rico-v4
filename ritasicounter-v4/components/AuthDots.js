import { useEffect, useRef } from "react";

// Background partikel dot yang tenang: titik-titik melayang pelan + garis
// penghubung tipis di dekat kursor. Warna amber industrial, opacity rendah.
// SSR-aman (semua jalan di useEffect), hormati prefers-reduced-motion.
export default function AuthDots({ density }) {
  const ref = useRef(null);

  useEffect(function () {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let w = 0, h = 0;
    const mouse = { x: -9999, y: -9999 };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dark = document.documentElement.getAttribute("data-theme") === "dark";

    const N = density || Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 16000));
    const dots = Array.from({ length: N }, function () {
      return {
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00045,
        vy: (Math.random() - 0.5) * 0.00045,
        r: 1 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
        accent: Math.random() < 0.22,
      };
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }
    function onLeave() { mouse.x = -9999; mouse.y = -9999; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);

    const LINK = 130;
    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      const pts = dots.map(function (d) {
        if (!reduced) {
          d.x = (d.x + d.vx + 1) % 1;
          d.y = (d.y + d.vy + 1) % 1;
        }
        return { x: d.x * w, y: d.y * h, d };
      });
      // garis penghubung
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK) {
            const a = (1 - dist / LINK) * (dark ? 0.16 : 0.12);
            ctx.strokeStyle = dark ? "rgba(245,158,11," + a + ")" : "rgba(194,65,12," + a + ")";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      // titik
      pts.forEach(function (p) {
        const tw = reduced ? 0.7 : 0.45 + 0.35 * Math.sin(t / 1400 + p.d.ph);
        if (p.d.accent) {
          ctx.fillStyle = dark ? "rgba(245,158,11," + tw + ")" : "rgba(194,65,12," + (tw * 0.9) + ")";
        } else {
          ctx.fillStyle = dark ? "rgba(231,229,228," + (tw * 0.5) + ")" : "rgba(68,64,60," + (tw * 0.45) + ")";
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.d.r, 0, Math.PI * 2); ctx.fill();
      });
      // highlight lembut di sekitar kursor
      if (mouse.x > 0) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
        if (dark) { g.addColorStop(0, "rgba(245,158,11,0.07)"); g.addColorStop(1, "rgba(245,158,11,0)"); }
        else { g.addColorStop(0, "rgba(194,65,12,0.06)"); g.addColorStop(1, "rgba(194,65,12,0)"); }
        ctx.fillStyle = g;
        ctx.fillRect(mouse.x - 180, mouse.y - 180, 360, 360);
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return function () {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, [density]);

  return <canvas ref={ref} className="auth-bg-canvas" aria-hidden="true" />;
}
