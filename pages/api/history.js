export default async function handler(req, res) {
    try {
      const response = await fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/koordinat_kendaraan?limit=-1");
  
      if (!response.ok) throw new Error("Gagal fetch data eksternal");
  
      const data = await response.json();
      res.status(200).json(data);
    } catch (err) {
      console.error("API HISTORY ERROR:", err);
      res.status(500).json({ error: "Gagal mengambil data riwayat." });
    }
  }
  