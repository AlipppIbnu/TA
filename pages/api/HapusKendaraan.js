// pages/api/HapusKendaraan.js
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Ambil ID dari query parameter atau body
    const id = req.query.id || req.body.id;
    
    if (!id) {
      return res.status(400).json({ message: 'ID kendaraan diperlukan' });
    }

    // URL untuk menghapus data di Directus
    const directusUrl = `${directusConfig.baseURL}/items/vehicle/${id}`;

    // Kirim request DELETE ke Directus
    const response = await fetch(directusUrl, {
      method: 'DELETE',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = `Failed to delete: ${response.status} ${response.statusText}`;
      
      try {
        const errorText = await response.text();
        errorMessage += ` - ${errorText}`;
      } catch (e) {
        // Tidak bisa membaca error text
      }
      
      console.error("Delete error:", errorMessage);
      return res.status(response.status).json({ 
        message: 'Gagal menghapus kendaraan dari database',
        error: errorMessage
      });
    }

    res.status(200).json({ 
      message: 'Kendaraan berhasil dihapus!',
      success: true 
    });

  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan internal server', 
      error: error.message 
    });
  }
}