// pages/api/history.js
export default async function handler(req, res) {
  // URL API Directus untuk data koordinat kendaraan (tanpa batasan limit)
  const API_URL = "http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/koordinat_kendaraan?limit=-1";

  try {
    // Fetch data riwayat koordinat dari Directus
    const response = await fetch(API_URL);

    // Periksa apakah response berhasil
    if (!response.ok) {
      const errorText = await response.text(); // Untuk debugging lebih detail
      throw new Error(`Gagal fetch data eksternal: ${errorText}`);
    }

    // Parse response sebagai JSON
    const data = await response.json();
    
    // Kirim data ke client
    res.status(200).json(data);
    
  } catch (err) {
    // Tangani error dengan log dan response yang sesuai
    console.error("API HISTORY ERROR:", err.message || err);
    res.status(500).json({ error: "Gagal mengambil data riwayat." });
  }
}