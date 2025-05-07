export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetch('http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/admin/content/daftar_kendaraan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_TOKEN}`, // gunakan env yang benar
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text(); // Ambil response sebagai teks biasa dulu

    if (!response.ok) {
      console.error("Gagal respons dari Directus:", text);
      return res.status(500).json({ message: 'Gagal tambah kendaraan', detail: text });
    }

    const data = JSON.parse(text); // Jika sukses, parse jadi JSON
    res.status(200).json({ message: 'Sukses', data });

  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
