// pages/api/TambahKendaraan.js
import { getCurrentUser } from '@/lib/authService';
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get current user
    const user = getCurrentUser();
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = user.userId;

    const { 
      nomor_kendaraan, 
      merek, 
      model, 
      tahun_pembuatan, 
      warna, 
      jenis_kendaraan, 
      pemilik 
    } = req.body;
    
    // Validasi data
    if (!nomor_kendaraan || !merek || !model || !tahun_pembuatan || !warna || !jenis_kendaraan || !pemilik) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    // Siapkan data dengan user_id
    const directusData = {
      vehicle_id: nomor_kendaraan,
      nomor_kendaraan: nomor_kendaraan,
      merek: merek,
      model: model,
      tahun_pembuatan: tahun_pembuatan,
      warna: warna,
      jenis_kendaraan: jenis_kendaraan,
      Jenis_Kendaraan: jenis_kendaraan,
      pemilik: pemilik,
      user_id: userId, // Pastikan user_id selalu ada
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const response = await fetch(directusConfig.endpoints.vehicles, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(directusData),
    });

    const text = await response.text();

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

    res.status(200).json({ 
      message: `Kendaraan ${merek} ${model} berhasil ditambahkan!`, 
      data: data.data || data,
      success: true,
      user_id: userId
    });

  } catch (error) {
    console.error("API error:", error);
    
    // Handle authentication error
    if (error.message.includes('Invalid') || error.message.includes('token')) {
      return res.status(401).json({
        message: 'Unauthorized: Token tidak valid atau expired',
        error: error.message,
        success: false
      });
    }
    
    res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message,
      success: false
    });
  }
}