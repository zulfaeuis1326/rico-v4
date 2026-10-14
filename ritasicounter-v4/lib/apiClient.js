// Helper fetch JSON yang aman: kalau server mengembalikan HTML (mis. halaman
// error 500 karena env belum lengkap), lempar pesan yang bisa dipahami user,
// bukan "Unexpected token '<', ..." yang membingungkan.
export async function apiJson(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    throw new Error("Gagal koneksi ke server (" + (e.message || "network error") + ")");
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (!res.ok) throw new Error("Server error " + res.status + " — kemungkinan env belum lengkap (DATABASE_URL / JWT_SECRET) atau database tidak terjangkau. Cek log server.");
      throw new Error("Respon server tidak valid (bukan JSON).");
    }
  }
  if (!res.ok) throw new Error((data && data.error) || ("Request gagal (HTTP " + res.status + ")"));
  return data || {};
}
