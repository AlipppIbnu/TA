// pages/api/geofence-events.js - API untuk menyimpan geofence events
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vehicle_id, geofence_id, event, event_timestamp } = req.body;

    // Validasi input
    if (!vehicle_id || !geofence_id || !event) {
      return res.status(400).json({
        success: false,
        message: 'Field vehicle_id, geofence_id, dan event wajib diisi'
      });
    }

    // Siapkan data untuk Directus
    const directusData = {
      vehicle_id: vehicle_id,
      geofence_id: geofence_id,
      event: event, // enter, exit, violation_enter, violation_exit
      event_timestamp: event_timestamp || new Date().toISOString()
    };

    console.log('📍 Menyimpan geofence event:', directusData);

    // Kirim ke Directus
    const response = await fetch(`${directusConfig.baseURL}/items/geofence_events`, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(directusData)
    });

    if (response.ok) {
      const data = await response.json();
      
      console.log('✅ Geofence event berhasil disimpan:', data);
      
      return res.status(200).json({
        success: true,
        message: 'Geofence event berhasil disimpan',
        data: data.data
      });
    } else {
      // Handle error response
      const responseText = await response.text();
      
      console.error("❌ Directus error response:", responseText);
      console.error("❌ Response status:", response.status);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.error("❌ Parsed error data:", errorData);
      } catch {
        console.error("❌ Could not parse error response as JSON");
        errorData = { message: responseText };
      }

      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Gagal menyimpan geofence event',
        detail: errorData
      });
    }

  } catch (error) {
    console.error("❌ API Error:", error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
} 