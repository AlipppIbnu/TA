// API handler untuk mengambil data koordinat kendaraan dari Directus

// Directus base API URL - Updated to use new endpoint
const DIRECTUS_API_URL = 'http://ec2-13-229-83-7.ap-southeast-1.compute.amazonaws.com:8055/items/vehicle_datas';

/**
 * API handler untuk mengambil data koordinat kendaraan dari Directus
 * 
 * Query parameters:
 * - vehicle_id: Filter berdasarkan vehicle_id kendaraan (opsional)
 * - limit: Batasi jumlah hasil (default: 100, -1 untuk semua)
 * - last_only: Hanya ambil koordinat terakhir untuk setiap kendaraan (default: false)
 * - since: Ambil koordinat sejak timestamp tertentu (format ISO, opsional)
 */
export default async function handler(req, res) {
  // Hanya terima request GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Extract query parameters
  const { 
    vehicle_id, // Changed from 'id' to 'vehicle_id' 
    limit = 100, 
    last_only = false, 
    since = null 
  } = req.query;

  try {
    // Buat URL query untuk Directus
    let apiUrl = DIRECTUS_API_URL;
    
    // Tambahkan parameter query
    const queryParams = new URLSearchParams();
    
    // Parameter limit
    if (limit !== '-1') {
      queryParams.append('limit', limit);
    }
    
    // Filter berdasarkan vehicle_id jika diberikan
    if (vehicle_id) {
      queryParams.append('filter[vehicle_id][_eq]', vehicle_id);
    }
    
    // Filter berdasarkan timestamp jika parameter since diberikan
    if (since) {
      queryParams.append('filter[timestamp][_gt]', since);
    }
    
    // Selalu urutkan berdasarkan timestamp terbaru
    queryParams.append('sort', '-timestamp');
    
    // Gabungkan URL dengan query parameters
    if (queryParams.toString()) {
      apiUrl += `?${queryParams.toString()}`;
    }
    
    // Tambahkan timeout untuk mencegah request menggantung
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 detik timeout
    
    // Fetch data dari Directus API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      // Pastikan mendapatkan data terbaru
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Directus API error: ${response.status} ${response.statusText}`);
      
      // Coba dapatkan detail error
      let errorDetail = '';
      try {
        const errorText = await response.text();
        errorDetail = errorText;
        console.error('Error detail:', errorText);
      } catch (e) {
        console.error('Could not read error details', e);
      }
      
      return res.status(502).json({
        success: false,
        message: 'Gagal terhubung ke server Directus',
        error: `${response.status} ${response.statusText}`,
        detail: errorDetail
      });
    }

    // Jaga-jaga jika response bukan JSON
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return res.status(500).json({
        success: false,
        message: 'Format respons dari Directus tidak valid',
        error: parseError.message
      });
    }
    
    // Validasi struktur data yang diterima
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error('Invalid data structure from Directus:', data);
      return res.status(500).json({
        success: false,
        message: 'Struktur data dari Directus tidak valid',
        received: data
      });
    }
    
    // Transform data to match expected format - map new field names
    let result = data.data.map(item => ({
      id: item.vehicle_id, // Map vehicle_id to id for compatibility
      vehicle_datas_id: item.vehicle_datas_id,
      vehicle_id: item.vehicle_id,
      latitude: item.latitude,
      longitude: item.longitude,
      speed: item.speed,
      rpm: item.rpm,
      fuel_level: item.fuel_level,
      ignition_status: item.ignition_status,
      battery_level: item.battery_level,
      satellites_used: item.satellites_used,
      timestamp: item.timestamp,
      gps_id: item.gps_id
    }));
    
    // Proses data berdasarkan parameter last_only
    if (last_only === 'true' && Array.isArray(result)) {
      // Jika last_only=true, ambil hanya koordinat terakhir untuk setiap kendaraan
      const latestCoordinates = {};
      
      for (const coord of result) {
        const vehicleId = coord.vehicle_id; // Use vehicle_id instead of id
        
        if (!latestCoordinates[vehicleId] || 
            new Date(coord.timestamp) > new Date(latestCoordinates[vehicleId].timestamp)) {
          latestCoordinates[vehicleId] = coord;
        }
      }
      
      // Konversi object kembali ke array
      result = Object.values(latestCoordinates);
    }
    
    // Tambahkan metadata yang berguna
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      count: result.length,
      data: result
    });
    
  } catch (error) {
    console.error('API KoordinatKendaraan error:', error);
    
    // Pesan error yang lebih spesifik
    let errorMessage = 'Failed to fetch vehicle coordinates';
    let errorType = 'unknown';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Connection to Directus timed out';
      errorType = 'timeout';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Failed to connect to Directus server';
      errorType = 'connection';
    }
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
      type: errorType,
      error: error.message
    });
  }
}