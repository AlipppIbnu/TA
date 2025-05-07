// pages/api/TambahKendaraan.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Log data yang dikirim untuk debugging
    console.log("Data yang dikirim dari form:", JSON.stringify(req.body, null, 2));

    // Validasi data yang diperlukan
    const { nomor_kendaraan, merek, model, tahun_pembuatan, warna, jenis_kendaraan, pemilik } = req.body;
    
    if (!nomor_kendaraan || !merek || !model || !tahun_pembuatan || !warna || !jenis_kendaraan || !pemilik) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    // Siapkan data yang akan dikirim ke Directus dengan pemetaan field yang benar
    const directusData = {
      vehicle_id: nomor_kendaraan,    // Ini adalah kunci! Directus mengharapkan field ini
      nomor_kendaraan: nomor_kendaraan,
      merek: merek,
      model: model,
      tahun_pembuatan: tahun_pembuatan,
      warna: warna,
      jenis_kendaraan: jenis_kendaraan,
      pemilik: pemilik
    };

    console.log("Data yang dikirim ke Directus:", JSON.stringify(directusData, null, 2));

    // Data sudah valid, kirim ke Directus
    const response = await fetch('http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/daftar_kendaraan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(directusData),
    });

    // Ambil respons sebagai teks
    const text = await response.text();
    console.log("Status code:", response.status);
    console.log("Response body:", text);

    // Cek apakah respons berhasil atau tidak
    if (!response.ok) {
      return res.status(response.status).json({ 
        message: 'Gagal tambah kendaraan', 
        status: response.status,
        detail: text 
      });
    }

    // Parse respons JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      return res.status(500).json({ 
        message: 'Respons bukan format JSON valid', 
        detail: text.substring(0, 100) 
      });
    }

    // Respons sukses yang lebih informatif
    res.status(200).json({ 
      message: `Kendaraan ${merek} ${model} berhasil ditambahkan!`, 
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