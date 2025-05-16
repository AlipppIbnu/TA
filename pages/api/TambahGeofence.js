// pages/api/TambahGeofence.js 
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { kota, geofencing } = req.body;
    
    // Validasi input
    if (!kota) {
      return res.status(400).json({ 
        message: 'Nama kota harus diisi',
        success: false 
      });
    }
    
    if (!geofencing || !geofencing.geometry || !geofencing.geometry.coordinates) {
      return res.status(400).json({ 
        message: 'Data geofencing tidak valid',
        success: false 
      });
    }

    // Extract coordinates dari geofencing
    let coordinates = geofencing.geometry.coordinates;
    
    // Pastikan format koordinat sesuai dengan yang diharapkan Directus
    // Jika koordinat tidak dalam format array 3 level, sesuaikan
    if (!Array.isArray(coordinates[0][0])) {
      coordinates = [coordinates];
    }
    
    // Pastikan polygon tertutup (koordinat pertama dan terakhir sama)
    const firstRing = coordinates[0];
    if (firstRing.length > 0) {
      const firstPoint = firstRing[0];
      const lastPoint = firstRing[firstRing.length - 1];
      
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        firstRing.push([...firstPoint]);
      }
    }
    
    // Format data sesuai dengan format Directus yang benar
    const directusData = {
      Kota: kota,
      Geofence: {
        type: "Polygon",
        coordinates: coordinates
      }
    };

    // Kirim ke Directus
    const response = await fetch('http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/Geofence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(directusData),
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        message: `Geofence "${kota}" berhasil dibuat!`,
        data: data,
        success: true
      });
    } else {
      const responseText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = responseText;
      }
      
      return res.status(500).json({
        message: 'Gagal menyimpan geofence ke database',
        error: errorData,
        requestData: directusData,
        success: false
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message,
      success: false
    });
  }
}