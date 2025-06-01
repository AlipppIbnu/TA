// pages/api/TambahGeofence.js 
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  // Verifikasi method request
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, type, definition, rule_type, status, vehicle_id } = req.body;

    // Validasi input
    if (!name || !type || !definition) {
      return res.status(400).json({
        success: false,
        message: 'Field name, type, dan definition wajib diisi'
      });
    }

    // Validasi definition sebagai object
    if (typeof definition !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Definition harus berupa object GeoJSON'
      });
    }

    // Siapkan data untuk Directus
    const directusData = {
      name: name,
      type: type, 
      definition: JSON.stringify(definition),
      rule_type: rule_type || 'exit',
      status: status || 'active',
      vehicle_id: vehicle_id || null,
      date_created: new Date().toISOString()
    };

    // Kirim ke Directus
    const response = await fetch(`${directusConfig.baseURL}/items/geofences`, {
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
        message: `Geofence "${name}" berhasil dibuat`,
        data: data.data
      });
    } else {
      // Handle error response
      const responseText = await response.text();
      
      console.error("❌ Directus error response:", responseText);
      console.error("❌ Response status:", response.status);
      console.error("❌ Response headers:", [...response.headers.entries()]);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.error("❌ Parsed error data:", errorData);
      } catch (e) {
        console.error("❌ Could not parse error response as JSON");
        errorData = { message: responseText };
      }

      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Gagal membuat geofence',
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