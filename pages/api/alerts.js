// pages/api/alerts.js - API untuk alerts (GET dan POST)
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  try {
    // Handle GET request - fetch alerts
    if (req.method === 'GET') {
      const { limit = 20, sort = '-alert_id', since_id, user_id } = req.query;
      
      // SECURITY: Require user_id from authenticated client
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // First, get user's vehicle IDs to filter alerts
      const vehiclesUrl = `${directusConfig.baseURL}/items/vehicle?filter[user_id][_eq]=${user_id}&fields=vehicle_id`;
      const vehiclesResponse = await fetch(vehiclesUrl, {
        headers: directusConfig.headers
      });
      
      if (!vehiclesResponse.ok) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch user vehicles'
        });
      }
      
      const vehiclesData = await vehiclesResponse.json();
      const userVehicleIds = (vehiclesData.data || []).map(v => v.vehicle_id);
      
      // If user has no vehicles, return empty alerts
      if (userVehicleIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }
      
      // Build alerts URL with vehicle_id filter for user's vehicles only  
      let url = `${directusConfig.baseURL}/items/alerts?sort=${sort}&limit=${limit}`;
      
      // Add filter for user's vehicles only - SECURITY FILTER
      url += `&filter[vehicle_id][_in]=${userVehicleIds.join(',')}`;
      
      // Add filter for alerts since a specific ID
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
        console.error("❌ Directus GET error:", errorText);
        return res.status(response.status).json({
          success: false,
          message: 'Gagal mengambil alerts'
        });
  }
    }
    
    // Handle POST request - create alert
    else if (req.method === 'POST') {
    const { vehicle_id, alert_type, alert_message, lokasi, timestamp } = req.body;

    // Validasi input
    if (!vehicle_id || !alert_type || !alert_message) {
      return res.status(400).json({
        success: false,
        message: 'Field vehicle_id, alert_type, dan alert_message wajib diisi'
      });
    }

    // SECURITY: Verify user owns the vehicle  
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if vehicle belongs to current user
    const vehicleCheckUrl = `${directusConfig.baseURL}/items/vehicle?filter[vehicle_id][_eq]=${vehicle_id}&filter[user_id][_eq]=${user_id}&fields=vehicle_id`;
    const vehicleCheckResponse = await fetch(vehicleCheckUrl, {
      headers: directusConfig.headers
    });
    
    if (!vehicleCheckResponse.ok) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify vehicle ownership'
      });
    }
    
    const vehicleCheckData = await vehicleCheckResponse.json();
    if (!vehicleCheckData.data || vehicleCheckData.data.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Vehicle does not belong to current user'
      });
    }

    // Siapkan data untuk Directus
    const directusData = {
      vehicle_id: vehicle_id,
      alert_type: alert_type, // violation_enter, violation_exit, etc
      alert_message: alert_message,
      lokasi: lokasi || null,
      timestamp: timestamp || new Date().toISOString()
    };

    console.log('🚨 Menyimpan alert:', directusData);

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
      
      console.log('✅ Alert berhasil disimpan:', data);
      
      return res.status(200).json({
        success: true,
        message: 'Alert berhasil disimpan',
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
        message: errorData.message || 'Gagal menyimpan alert',
        detail: errorData
      });
      }
    }
    
    // Handle DELETE request - delete all user alerts
    else if (req.method === 'DELETE') {
      const { user_id } = req.body;
      
      // SECURITY: Require user_id from authenticated client
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // First, get user's vehicle IDs to filter alerts
      const vehiclesUrl = `${directusConfig.baseURL}/items/vehicle?filter[user_id][_eq]=${user_id}&fields=vehicle_id`;
      const vehiclesResponse = await fetch(vehiclesUrl, {
        headers: directusConfig.headers
      });
      
      if (!vehiclesResponse.ok) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch user vehicles'
        });
      }
      
      const vehiclesData = await vehiclesResponse.json();
      const userVehicleIds = (vehiclesData.data || []).map(v => v.vehicle_id);
      
      // If user has no vehicles, nothing to delete
      if (userVehicleIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No alerts to delete',
          deleted_count: 0
        });
      }
      
      // Get all alert IDs for user's vehicles
      const alertsUrl = `${directusConfig.baseURL}/items/alerts?filter[vehicle_id][_in]=${userVehicleIds.join(',')}&fields=alert_id`;
      const alertsResponse = await fetch(alertsUrl, {
        headers: directusConfig.headers
      });
      
      if (!alertsResponse.ok) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch user alerts'
        });
      }
      
      const alertsData = await alertsResponse.json();
      const alertIds = (alertsData.data || []).map(alert => alert.alert_id);
      
      if (alertIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No alerts to delete',
          deleted_count: 0
        });
      }
      
      // Delete alerts one by one to ensure reliability
      let deletedCount = 0;
      let errors = [];
      
      console.log(`🗑️ Starting to delete ${alertIds.length} alerts for user ${user_id}`);
      
      for (const alertId of alertIds) {
        try {
          const deleteUrl = `${directusConfig.baseURL}/items/alerts/${alertId}`;
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: directusConfig.headers
          });
          
          if (deleteResponse.ok) {
            deletedCount++;
            console.log(`✅ Deleted alert ${alertId}`);
          } else {
            const errorText = await deleteResponse.text();
            console.error(`❌ Failed to delete alert ${alertId}:`, errorText);
            errors.push(`Alert ${alertId}: ${errorText}`);
          }
        } catch (error) {
          console.error(`❌ Error deleting alert ${alertId}:`, error);
          errors.push(`Alert ${alertId}: ${error.message}`);
        }
      }
      
      console.log(`🏁 Deletion complete: ${deletedCount}/${alertIds.length} alerts deleted`);
      
      if (deletedCount > 0) {
        return res.status(200).json({
          success: true,
          message: `Successfully deleted ${deletedCount} out of ${alertIds.length} alerts`,
          deleted_count: deletedCount,
          total_requested: alertIds.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete any alerts',
          errors: errors
      });
      }
    }
    
    // Method not allowed
    else {
      return res.status(405).json({ message: 'Method not allowed' });
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