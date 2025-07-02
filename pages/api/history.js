// pages/api/history.js - Updated for new vehicle_datas structure
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
    // Build filter for date range if provided
    let filter = `filter[gps_id][_eq]=${encodeURIComponent(gps_id)}`;
    
    if (start_date && end_date) {
      filter += `&filter[timestamp][_between]=${encodeURIComponent([start_date, end_date].join(','))}`;
    }

    // Construct API URL for fetching historical data for specific gps_id
    const API_URL = `${directusConfig.baseURL}/items/vehicle_datas?${filter}&sort=-timestamp&limit=-1`;
    
    // console.log(`History API URL: ${API_URL}`); // Removed debugging log

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
    
    // console.log(`History API: Retrieved ${data.data?.length || 0} records for gps_id ${gps_id}`); // Removed debugging log

    // Transform and filter valid coordinates
    const transformedData = {
      data: data.data
        ?.filter(item => {
          // Filter out invalid coordinates
          const lat = parseFloat(item.latitude);
          const lng = parseFloat(item.longitude);
          
          return !isNaN(lat) && !isNaN(lng) && 
                 lat >= -90 && lat <= 90 && 
                 lng >= -180 && lng <= 180 &&
                 item.gps_id === gps_id; // Ensure it matches exactly
        })
        .map(item => ({
          latitude: parseFloat(item.latitude),
          longitude: parseFloat(item.longitude),
          timestamp: item.timestamp,
          vehicle_id: item.vehicle_id,
          gps_id: item.gps_id
        })) || []
    };

    // console.log(`History API: Returning ${transformedData.data.length} valid coordinates`); // Removed debugging log

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