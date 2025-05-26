// pages/api/relays/[id].js
/**
 * API handler untuk mengupdate data relay berdasarkan ID
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export default async function handler(req, res) {
  // Ekstrak ID relay dari parameter URL
  const { id } = req.query;
  
  // Hanya menerima method PATCH
  if (req.method === 'PATCH') {
    try {
      // URL API Directus untuk relay spesifik
      const RELAY_API_URL = `http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/relays/${id}`;
      
      // Kirim request update ke Directus API
      const response = await fetch(
        RELAY_API_URL, 
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(req.body),
        }
      );
      
      // Parse response sebagai JSON
      const data = await response.json();
      
      // Kirim data ke client dengan status code sesuai response
      res.status(response.ok ? 200 : 400).json(data);
    } catch (error) {
      // Log error dan kirim response error
      console.error("Error updating relay:", error);
      res.status(500).json({ error: "Failed to update relay" });
    }
  } else {
    // Method tidak diizinkan
    res.setHeader('Allow', ['PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}