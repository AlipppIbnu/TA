export default async function handler(req, res) {
  const API_URL = "http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/koordinat_kendaraan?limit=-1";

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      const errorText = await response.text(); // Untuk debugging lebih detail
      throw new Error(`Gagal fetch data eksternal: ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("API HISTORY ERROR:", err.message || err);
    res.status(500).json({ error: "Gagal mengambil data riwayat." });
  }
}
