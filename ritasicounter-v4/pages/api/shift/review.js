const { pool, ensureSchema } = require("../../../lib/db");
const { getUserFromReq } = require("../../../lib/auth");
const { atLeast } = require("../../../lib/roles");

// POST /api/shift/review — approval eksplisit pengawas (stempel resmi).
// Body: { shiftId } (opsional; default shift open). Toggle approve/unapprove via { approve: true/false }.
export default async function handler(req, res) {
  try {
    await ensureSchema();
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: "Belum login" });
    if (!atLeast(user.role, "pengawas")) return res.status(403).json({ error: "Hanya pengawas ke atas" });
    if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }

    let shiftId = req.body && req.body.shiftId;
    if (!shiftId) {
      const r = await pool.query("SELECT * FROM shifts WHERE status='open' ORDER BY id DESC LIMIT 1");
      if (!r.rows.length) return res.status(404).json({ error: "Tidak ada shift berjalan" });
      shiftId = r.rows[0].id;
    }
    const approve = !(req.body && req.body.approve === false);
    await pool.query(
      "UPDATE shifts SET review_status=$1, reviewed_by=$2, reviewed_at=now() WHERE id=$3",
      [approve ? "approved" : "pending", approve ? user.id : null, shiftId]
    );
    await pool.query(
      "INSERT INTO activity_log (actor_id, action, detail) VALUES ($1,$2,$3)",
      [user.id, approve ? "approve_shift" : "unapprove_shift", JSON.stringify({ shiftId })]
    );
    const r2 = await pool.query("SELECT s.*, u.username AS reviewer FROM shifts s LEFT JOIN users u ON u.id=s.reviewed_by WHERE s.id=$1", [shiftId]);
    return res.status(200).json({ shift: r2.rows[0] });
  } catch (err) {
    console.error("Error di /api/shift/review:", err);
    return res.status(500).json({ error: err.message });
  }
}
