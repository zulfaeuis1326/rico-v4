const { pool, ensureSchema } = require("../../../lib/db");
const { verifyPassword, createSessionForUser } = require("../../../lib/auth");
const { checkRateLimit, getClientIp } = require("../../../lib/rateLimit");
const { logActivity } = require("../../../lib/activity");

const ROLE_LABEL = { superadmin: "Superadmin", admin: "Admin", pengawas: "Pengawas", operator: "Operator" };

export default async function handler(req, res) {
  try {
    await ensureSchema();

    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end();
    }

    // Maks 10 percobaan login per 5 menit per IP -- nahan brute-force password tanpa
    // ganggu orang yang emang cuma typo password beberapa kali.
    const rl = checkRateLimit(`login:${getClientIp(req)}`, { max: 10, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      res.setHeader("Retry-After", String(rl.retryAfterSeconds));
      return res.status(429).json({ error: `Terlalu banyak percobaan login. Coba lagi dalam ${rl.retryAfterSeconds} detik.` });
    }

    const { username, password, role, unitId, newUnitName } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi" });
    }

    const result = await pool.query(
      `SELECT id, username, password_hash, role, status, token_version FROM users WHERE username = $1`,
      [username.trim()]
    );
    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Username atau password salah" });
    }

    if (user.status === "pending") {
      return res.status(403).json({ error: "Akun kamu masih menunggu persetujuan admin. Coba lagi nanti." });
    }
    if (user.status !== "active") {
      return res.status(403).json({ error: "Akun kamu dinonaktifkan. Hubungi admin." });
    }

    // Role yang dipilih di form login harus cocok dengan role akun.
    if (role && role !== user.role) {
      return res.status(403).json({ error: "Akun ini terdaftar sebagai " + (ROLE_LABEL[user.role] || user.role) + ". Pilih role yang sesuai." });
    }

    await createSessionForUser(res, user);

    // Operator login DENGAN nomor unit: set/switch unit sesi login ini.
    // Pengawas & admin tidak terikat unit — field unit diabaikan.
    let unit_id = user.unit_id;
    if (user.role === "operator") {
      const trimmedNew = (newUnitName || "").trim();
      if (trimmedNew) {
        let unit;
        try {
          const ins = await pool.query(`INSERT INTO units (name) VALUES ($1) RETURNING id`, [trimmedNew]);
          unit = ins.rows[0];
        } catch (err) {
          if (err.code === "23505") {
            const re = await pool.query(`UPDATE units SET active = true WHERE name = $1 RETURNING id`, [trimmedNew]);
            if (re.rows.length === 0) return res.status(409).json({ error: "Nama unit sudah dipakai unit lain yang masih aktif" });
            unit = re.rows[0];
          } else { throw err; }
        }
        if (unit.id !== user.unit_id) {
          await pool.query(`UPDATE users SET unit_id = $1 WHERE id = $2`, [unit.id, user.id]);
          await logActivity(user.id, "operator_switch_unit", { from: user.unit_id, to: unit.id, via: "login" }).catch(() => {});
        }
        unit_id = unit.id;
      } else if (unitId) {
        const chk = await pool.query(`SELECT id FROM units WHERE id = $1 AND active = true`, [unitId]);
        if (chk.rows.length === 0) return res.status(400).json({ error: "Unit tidak ditemukan/tidak aktif" });
        if (Number(unitId) !== user.unit_id) {
          await pool.query(`UPDATE users SET unit_id = $1 WHERE id = $2`, [unitId, user.id]);
          await logActivity(user.id, "operator_switch_unit", { from: user.unit_id, to: Number(unitId), via: "login" }).catch(() => {});
        }
        unit_id = Number(unitId);
      }
    }

    return res.status(200).json({ user: { id: user.id, username: user.username, role: user.role, unit_id } });
  } catch (err) {
    console.error("Error di /api/auth/login:", err);
    return res.status(500).json({ error: err.message });
  }
}
