// pages/api/check-directus-schema.js - Check Directus schema
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // console.log('Checking Directus schema...'); // Removed debugging log
    
    // Check collections endpoint
    const response = await fetch(`${directusConfig.baseURL}/collections`, {
      headers: directusConfig.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // console.log('Schema response status:', response.status); // Removed debugging log
    
    const schemaData = await response.json();
    // console.log('Schema data:', schemaData); // Removed debugging log
    
    res.status(200).json({
      success: true,
      collections: schemaData.data || schemaData,
      message: 'Schema check successful'
    });
    
  } catch (error) {
    let errorDetail = '';
    try {
      const errorText = await error.response?.text();
      errorDetail = errorText;
      console.error('Schema error:', errorText);
    } catch {
      // Could not read error details
    }
    
    res.status(500).json({
      success: false,
      message: 'Schema check failed',
      error: error.message,
      detail: errorDetail
    });
    
    console.error('Schema check error:', error);
  }
} 