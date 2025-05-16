// pages/api/DeleteKendaraan.js (tanpa folder, seperti TambahKendaraan.js)
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Log data yang dikirim untuk debugging
    console.log("Query params:", JSON.stringify(req.query, null, 2));
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Ambil ID dari query parameter atau body
    const id = req.query.id || req.body.id;
    
    // Validasi ID
    if (!id) {
      console.log("ID tidak ditemukan");
      return res.status(400).json({ message: 'ID kendaraan diperlukan' });
    }

    console.log(`Mencoba menghapus kendaraan dengan ID: ${id}`);

    // Kirim request DELETE ke Directus API
    const response = await fetch(`http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/daftar_kendaraan/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Ambil respons sebagai teks
    const text = await response.text();
    console.log("Status code:", response.status);
    console.log("Response body:", text);

    // Cek apakah respons berhasil atau tidak
    if (!response.ok) {
      console.log("Error response from Directus:", text);
      return res.status(response.status).json({ 
        message: 'Gagal menghapus kendaraan', 
        status: response.status,
        detail: text 
      });
    }

    // Untuk DELETE request, Directus biasanya mengembalikan response kosong
    // Jika ada data, coba parse sebagai JSON
    let data = null;
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        // Tidak perlu return error karena DELETE sukses tapi response bukan JSON
      }
    }

    // Respons sukses
    console.log(`Kendaraan dengan ID ${id} berhasil dihapus!`);
    res.status(200).json({ 
      message: `Kendaraan dengan ID ${id} berhasil dihapus!`,
      data 
    });

  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
}