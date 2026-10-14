const { pool, ensureSchema } = require("../../lib/db");

// GET /api/public-stats — statistik publik tanpa login (untuk landing / TV).
// Sengaja ringan: tanpa rincian per jam, hanya agregat.
export default async function handler(req, res) {
  try {
    await ensureSchema();
    if (req.method !== "GET") { res.setHeader("Allow", ["GET"]); return res.status(405).end(); }
    const s = await pool.query("SELECT * FROM shifts WHERE status='open' ORDER BY id DESC LIMIT 1");
    const shift = s.rows[0] || null;
    if (!shift) return res.status(200).json({ shift: null, grandTotal: 0, pits: [], unitsActive: 0 });
    const tot = await pool.query("SELECT COUNT(*)::int AS c FROM ritasi_clicks WHERE shift_id=$1", [shift.id]);
    const perPit = await pool.query(
      "SELECT COALESCE(p.name,'Tanpa PIT') AS pit, COUNT(*)::int AS total FROM ritasi_clicks rc JOIN units u ON u.id=rc.unit_id LEFT JOIN pits p ON p.id=u.pit_id WHERE rc.shift_id=$1 GROUP BY p.name ORDER BY total DESC",
      [shift.id]
    );
    const units = await pool.query("SELECT COUNT(DISTINCT unit_id)::int AS c FROM ritasi_clicks WHERE shift_id=$1", [shift.id]);
    return res.status(200).json({
      shift: { id: shift.id, label: shift.label, shift_type: shift.shift_type, review_status: shift.review_status },
      grandTotal: tot.rows[0].c,
      unitsActive: units.rows[0].c,
      pits: perPit.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
