// pages/api/alerts.js - API untuk mengelola alerts (GET dan POST)
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  try {
    // Tangani request GET - ambil alerts
    if (req.method === 'GET') {
      const { limit = 20, sort = '-alert_id', since_id, user_id } = req.query;
      
      // KEAMANAN: Memerlukan user_id dari client yang terautentikasi
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID diperlukan'
        });
      }
      
      // Pertama, ambil ID kendaraan user untuk filter alerts
      const vehiclesUrl = `${directusConfig.baseURL}/items/vehicle?filter[user_id][_eq]=${user_id}&fields=vehicle_id`;
      const vehiclesResponse = await fetch(vehiclesUrl, {
        headers: directusConfig.headers
      });
      
      if (!vehiclesResponse.ok) {
        return res.status(500).json({
          success: false,
          message: 'Gagal mengambil data kendaraan user'
        });
      }
      
      const vehiclesData = await vehiclesResponse.json();
      const userVehicleIds = (vehiclesData.data || []).map(v => v.vehicle_id);
      
      // Jika user tidak punya kendaraan, return alerts kosong
      if (userVehicleIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }
      
      // Buat URL alerts dengan filter vehicle_id hanya untuk kendaraan user
      let url = `${directusConfig.baseURL}/items/alerts?sort=${sort}&limit=${limit}`;
      
      // Tambah filter untuk kendaraan user saja - FILTER KEAMANAN
      url += `&filter[vehicle_id][_in]=${userVehicleIds.join(',')}`;
      
      // Tambah filter untuk alerts sejak ID tertentu
      if (since_id) {
        url += `&filter[alert_id][_gt]=${since_id}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: directusConfig.headers
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json(data);
      } else {
        const errorText = await response.text();
        console.error("Error Directus GET:", errorText);
        return res.status(response.status).json({
          success: false,
          message: 'Gagal mengambil alerts'
        });
  }
    }
    
    // Tangani request POST - buat alert
    else if (req.method === 'POST') {
    const { vehicle_id, alert_type, alert_message, lokasi, timestamp } = req.body;

    // Validasi input
    if (!vehicle_id || !alert_type || !alert_message) {
      return res.status(400).json({
        success: false,
        message: 'Field vehicle_id, alert_type, dan alert_message wajib diisi'
      });
    }

    // KEAMANAN: Verifikasi user memiliki kendaraan tersebut
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID diperlukan'
      });
    }

    // Cek apakah kendaraan milik user saat ini
    const vehicleCheckUrl = `${directusConfig.baseURL}/items/vehicle?filter[vehicle_id][_eq]=${vehicle_id}&filter[user_id][_eq]=${user_id}&fields=vehicle_id`;
    const vehicleCheckResponse = await fetch(vehicleCheckUrl, {
      headers: directusConfig.headers
    });
    
    if (!vehicleCheckResponse.ok) {
      return res.status(500).json({
        success: false,
        message: 'Gagal memverifikasi kepemilikan kendaraan'
      });
    }
    
    const vehicleCheckData = await vehicleCheckResponse.json();
    if (!vehicleCheckData.data || vehicleCheckData.data.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Kendaraan bukan milik user saat ini'
      });
    }

    // Siapkan data untuk Directus
    const directusData = {
      vehicle_id: vehicle_id,
      alert_type: alert_type, // violation_enter, violation_exit, dll
      alert_message: alert_message,
      lokasi: lokasi || null,
      timestamp: timestamp || new Date().toISOString()
    };

    // Kirim ke Directus
    const response = await fetch(`${directusConfig.baseURL}/items/alerts`, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(directusData)
    });

    if (response.ok) {
      const data = await response.json();
      
      return res.status(200).json({
        success: true,
        message: 'Alert berhasil disimpan',
        data: data.data
      });
    } else {
      // Tangani response error
      const responseText = await response.text();
      
      console.error("Error response Directus:", responseText);
      console.error("Status response:", response.status);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.error("Data error yang diparsing:", errorData);
      } catch {
        console.error("Tidak bisa parsing error response sebagai JSON");
        errorData = { message: responseText };
      }

      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Gagal menyimpan alert',
        detail: errorData
      });
      }
    }
    
    // Tangani request DELETE - hapus semua alerts user
    else if (req.method === 'DELETE') {
      const { user_id } = req.body;
      
      // KEAMANAN: Memerlukan user_id dari client yang terautentikasi
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID diperlukan'
        });
      }
      
      // Pertama, ambil ID kendaraan user untuk filter alerts
      const vehiclesUrl = `${directusConfig.baseURL}/items/vehicle?filter[user_id][_eq]=${user_id}&fields=vehicle_id`;
      const vehiclesResponse = await fetch(vehiclesUrl, {
        headers: directusConfig.headers
      });
      
      if (!vehiclesResponse.ok) {
        return res.status(500).json({
          success: false,
          message: 'Gagal mengambil data kendaraan user'
        });
      }
      
      const vehiclesData = await vehiclesResponse.json();
      const userVehicleIds = (vehiclesData.data || []).map(v => v.vehicle_id);
      
      // Jika user tidak punya kendaraan, tidak ada yang dihapus
      if (userVehicleIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Tidak ada alerts untuk dihapus',
          deleted_count: 0
        });
      }
      
      // Ambil semua ID alert untuk kendaraan user dengan limit tinggi untuk memastikan semua alert terambil
      const alertsUrl = `${directusConfig.baseURL}/items/alerts?filter[vehicle_id][_in]=${userVehicleIds.join(',')}&fields=alert_id&limit=10000`;
      const alertsResponse = await fetch(alertsUrl, {
        headers: directusConfig.headers
      });
      
      if (!alertsResponse.ok) {
        return res.status(500).json({
          success: false,
          message: 'Gagal mengambil alerts user'
        });
      }
      
      const alertsData = await alertsResponse.json();
      const alertIds = (alertsData.data || []).map(alert => alert.alert_id);
      
      if (alertIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Tidak ada alerts untuk dihapus',
          deleted_count: 0
        });
      }
      
      // Hapus alerts satu per satu untuk memastikan reliabilitas
      let deletedCount = 0;
      let errors = [];
      
      for (const alertId of alertIds) {
        try {
          const deleteUrl = `${directusConfig.baseURL}/items/alerts/${alertId}`;
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: directusConfig.headers
          });
          
          if (deleteResponse.ok) {
            deletedCount++;
          } else {
            const errorText = await deleteResponse.text();
            console.error(`Gagal menghapus alert ${alertId}:`, errorText);
            errors.push(`Alert ${alertId}: ${errorText}`);
          }
        } catch (error) {
          console.error(`Error menghapus alert ${alertId}:`, error);
          errors.push(`Alert ${alertId}: ${error.message}`);
        }
      }
      
      if (deletedCount > 0) {
        return res.status(200).json({
          success: true,
          message: `Berhasil menghapus ${deletedCount} dari ${alertIds.length} alerts`,
          deleted_count: deletedCount,
          total_requested: alertIds.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Gagal menghapus alerts apapun',
          errors: errors
      });
      }
    }
    
    // Method tidak diizinkan
    else {
      return res.status(405).json({ message: 'Method tidak diizinkan' });
    }

  } catch (error) {
    console.error("Error API:", error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
} 