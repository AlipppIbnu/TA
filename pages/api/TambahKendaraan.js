// pages/api/TambahKendaraan.js
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      license_plate,
      name, 
      merek, 
      model, 
      tahun_pembuatan,
      sim_card_number,
      gps_id,
      user_id
    } = req.body;
    
    if (!user_id) {
      return res.status(401).json({ message: 'User ID required' });
    }
    
    if (!license_plate || !name || !merek || !model || !tahun_pembuatan) {
      return res.status(400).json({ message: 'Semua field wajib harus diisi' });
    }

    const directusData = {
      user_id: user_id,
      gps_id: gps_id || null,
      license_plate: license_plate,
      name: name,
      make: merek,
      model: model,
      year: parseInt(tahun_pembuatan),
      sim_card_number: sim_card_number || null,
      relay_status: "ON",
      create_at: new Date().toISOString(),
      update_at: new Date().toISOString(),
      vehicle_photo: null,
      geofence_id: null
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
      return res.status(response.status).json({ 
        message: 'Gagal tambah kendaraan ke database', 
        status: response.status
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ 
        message: 'Respons bukan format JSON valid'
      });
    }

    res.status(200).json({ 
      message: `Kendaraan ${merek} ${model} berhasil ditambahkan!`, 
      data: data.data || data,
      success: true
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message,
      success: false
    });
  }
}