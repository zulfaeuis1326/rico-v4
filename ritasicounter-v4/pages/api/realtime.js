const { ensureSchema } = require("../../lib/db");
const { getOrCreateOpenShift } = require("../../lib/shift");
const { buildRecap } = require("../../lib/recap");
const { nowParts, TZ_NAME, OFFSET_HOURS } = require("../../lib/time");
const { getUserFromReq } = require("../../lib/auth");

// GET /api/realtime — Server-Sent Events: push rekap + history tiap 3 detik.
// Lebih canggih dari polling biasa: satu koneksi, update otomatis.
export default async function handler(req, res) {
  try {
    await ensureSchema();
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: "Belum login" });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");

    const lockedUnitId = user.role === "operator" ? user.unit_id : null;
    const lockedOperatorId = user.role === "operator" ? user.id : null;

    async function push() {
      try {
        const shift = await getOrCreateOpenShift();
        const recap = await buildRecap(shift.id, lockedUnitId, lockedOperatorId);
        const payload = {
          t: Date.now(),
          currentHour: nowParts().hour,
          tzInfo: TZ_NAME + " (UTC+" + OFFSET_HOURS + ")",
          recap: Object.assign({ currentHour: nowParts().hour }, recap),
        };
        res.write("data: " + JSON.stringify(payload) + "\n\n");
      } catch (e) {
        res.write("data: " + JSON.stringify({ error: e.message }) + "\n\n");
      }
    }

    await push();
    const timer = setInterval(push, 3000);
    req.on("close", function () { clearInterval(timer); try { res.end(); } catch (e) {} });
  } catch (err) {
    console.error("Error di /api/realtime:", err);
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    try { res.end(); } catch (e) {}
  }
}
