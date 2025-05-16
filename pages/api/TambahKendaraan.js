// api/TambahKendaraan.js
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

    // Siapkan data yang akan dikirim ke Directus dengan mapping field yang konsisten
    const directusData = {
      vehicle_id: nomor_kendaraan,
      nomor_kendaraan: nomor_kendaraan,
      merek: merek,
      model: model,
      tahun_pembuatan: tahun_pembuatan,
      warna: warna,
      jenis_kendaraan: jenis_kendaraan,  
      Jenis_Kendaraan: jenis_kendaraan,  
      pemilik: pemilik
    };

    console.log("Data yang dikirim ke Directus:", JSON.stringify(directusData, null, 2));

    // Kirim data ke Directus
    const response = await fetch('http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/daftar_kendaraan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(directusData),
    });

    // Ambil respons sebagai teks untuk debugging
    const text = await response.text();
    console.log("Status code:", response.status);
    console.log("Response body:", text);

    // Cek apakah respons berhasil
    if (!response.ok) {
      console.error("API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: text
      });
      return res.status(response.status).json({ 
        message: 'Gagal tambah kendaraan ke database', 
        status: response.status,
        detail: text 
      });
    }

    // Parse respons JSON
    let data;
    try {
      data = JSON.parse(text);
      console.log("Parsed response data:", data);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      return res.status(500).json({ 
        message: 'Respons bukan format JSON valid', 
        detail: text.substring(0, 100) 
      });
    }

    // Respons sukses
    res.status(200).json({ 
      message: `Kendaraan ${merek} ${model} berhasil ditambahkan!`, 
      data: data.data || data, // Handle different response structures
      success: true
    });

  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message,
      success: false
    });
  }
}