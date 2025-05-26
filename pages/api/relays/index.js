// pages/api/relays/index.js
/**
 * API handler untuk mengambil data relay dari Directus
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export default async function handler(req, res) {
  // URL API Directus untuk data relay
  const RELAYS_API_URL = "http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/relays";
  
  try {
    // Fetch data dari Directus API
    const response = await fetch(RELAYS_API_URL);
    
    // Parse response sebagai JSON
    const data = await response.json();
    
    // Kirim data ke client
    res.status(200).json(data);
    
  } catch (error) {
    // Log error dan kirim response error
    console.error("Error fetching relays:", error);
    res.status(500).json({ error: "Failed to fetch relays data" });
  }
}