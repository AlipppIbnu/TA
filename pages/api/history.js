// API untuk mengambil data history koordinat kendaraan
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { gps_id, start_date, end_date } = req.query;

  if (!gps_id) {
    return res.status(400).json({ success: false, message: 'gps_id parameter is required' });
  }

  try {
    // Buat filter untuk rentang tanggal jika disediakan
    let filter = `filter[gps_id][_eq]=${encodeURIComponent(gps_id)}`;
    
    if (start_date && end_date) {
      filter += `&filter[timestamp][_between]=${encodeURIComponent([start_date, end_date].join(','))}`;
    }

    // Konstruksi URL API untuk mengambil data historis berdasarkan gps_id spesifik
    const API_URL = `${directusConfig.baseURL}/items/vehicle_datas?${filter}&sort=-timestamp&limit=-1`;
    
    // console.log(`History API URL: ${API_URL}`); // Log debugging dihapus

    const response = await fetch(API_URL, {
      headers: directusConfig.headers,
      timeout: 10000
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Directus API Error: ${response.status} - ${errorText}`);
      
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch data from Directus',
        detail: errorText
      });
    }

    const data = await response.json();
    
    // console.log(`History API: Retrieved ${data.data?.length || 0} records for gps_id ${gps_id}`); // Log debugging dihapus

    // Transform dan filter koordinat yang valid
    const transformedData = {
      data: data.data
        ?.filter(item => {
          // Filter koordinat yang tidak valid
          const lat = parseFloat(item.latitude);
          const lng = parseFloat(item.longitude);
          
          return !isNaN(lat) && !isNaN(lng) && 
                 lat >= -90 && lat <= 90 && 
                 lng >= -180 && lng <= 180 &&
                 item.gps_id === gps_id; // Pastikan cocok persis
        })
        .map(item => ({
          latitude: parseFloat(item.latitude),
          longitude: parseFloat(item.longitude),
          timestamp: item.timestamp,
          vehicle_id: item.vehicle_id,
          gps_id: item.gps_id
        })) || []
    };

    // console.log(`History API: Returning ${transformedData.data.length} valid coordinates`); // Log debugging dihapus

    return res.status(200).json({
      success: true,
      ...transformedData
    });

  } catch (err) {
    console.error("HISTORY API ERROR:", err.message || err);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
}