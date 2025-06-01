/**
 * Checks if a point is inside a polygon using ray casting algorithm
 * @param {Array} point - [lat, lng] of the point to check
 * @param {Array} polygon - Array of [lat, lng] points forming the polygon
 * @returns {Boolean} - true if point is inside polygon
 */
export function isPointInPolygon(point, polygon) {
  // Ray casting algorithm
  let inside = false;
  const x = point[0], y = point[1];
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Checks if a point is inside any polygon of a multipolygon
 * @param {Array} point - [lat, lng] of the point to check
 * @param {Array} multipolygon - Array of polygons
 * @returns {Boolean} - true if point is inside any polygon
 */
export function isPointInMultiPolygon(point, multipolygon) {
  return multipolygon.some(polygon => isPointInPolygon(point, polygon));
}

/**
 * Calculates the minimum distance from a point to any polygon in meters
 * @param {Array} point - [lat, lng] of the point
 * @param {Array} polygon - Array of [lat, lng] points forming the polygon
 * @returns {Number} - distance in meters
 */
export function distanceToPolygon(point, polygon) {
  // Convert lat/lng to radians for Haversine formula
  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }
  
  // Haversine formula to calculate distance between two points in km
  function haversineDistance(point1, point2) {
    const R = 6371000; // Earth radius in meters
    const dLat = toRadians(point2[0] - point1[0]);
    const dLon = toRadians(point2[1] - point1[1]);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRadians(point1[0])) * Math.cos(toRadians(point2[0])) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // Find minimum distance to any edge of the polygon
  let minDistance = Infinity;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const segment = [polygon[j], polygon[i]];
    
    // Calculate distance to segment
    const distance = distanceToSegment(point, segment);
    minDistance = Math.min(minDistance, distance);
  }
  
  // Calculate distance to line segment
  function distanceToSegment(point, segment) {
    const [p1, p2] = segment;
    
    // Special case: segment is actually a point
    if (p1[0] === p2[0] && p1[1] === p2[1]) {
      return haversineDistance(point, p1);
    }
    
    // Find nearest point on segment using vector projection
    // This is an approximation for small distances
    const x = point[0], y = point[1];
    const x1 = p1[0], y1 = p1[1];
    const x2 = p2[0], y2 = p2[1];
    
    // Calculate squared length of segment
    const segmentLengthSquared = (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1);
    
    // Project point onto segment
    let t = ((x-x1)*(x2-x1) + (y-y1)*(y2-y1)) / segmentLengthSquared;
    t = Math.max(0, Math.min(1, t));
    
    // Find nearest point on segment
    const nearestX = x1 + t * (x2-x1);
    const nearestY = y1 + t * (y2-y1);
    
    // Calculate distance to nearest point
    return haversineDistance(point, [nearestX, nearestY]);
  }
  
  return minDistance;
}

/**
 * Gets the geofence status for a vehicle
 * @param {Object} vehicle - Vehicle object with position property
 * @param {Array} geofences - Array of geofence objects
 * @returns {Object|null} - Geofence status object or null
 */
export function getGeofenceStatus(vehicle, geofences) {
  if (!vehicle.position) return null;
  
  const vehiclePosition = [vehicle.position.lat, vehicle.position.lng];
  let nearestGeofence = null;
  let minDistance = Infinity;
  
  // Check if the vehicle is inside any geofence
  for (const geofence of geofences) {
    let geofencePolygons = [];
    
    try {
      // Parse geofence data (could be single polygon or multipolygon)
      const geoData = typeof geofence.definition === 'string' 
        ? JSON.parse(geofence.definition) 
        : geofence.definition;
      
      if (geoData && geoData.coordinates) {
        // Handle both single polygon and multipolygon
        if (geoData.type === 'Polygon') {
          // Single polygon - format coordinates
          const polygonCoords = geoData.coordinates[0]
            .map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
          geofencePolygons = [polygonCoords];
        } 
        else if (geoData.type === 'MultiPolygon') {
          // MultiPolygon - format each polygon's coordinates
          geofencePolygons = geoData.coordinates.map(polygonCoords => 
            polygonCoords[0].map(coord => [coord[1], coord[0]])
          );
        }
      }
      
      // Check if vehicle is in this geofence
      if (geofencePolygons.length && isPointInMultiPolygon(vehiclePosition, geofencePolygons)) {
        return {
          inside: true,
          name: geofence.name,
          id: geofence.geofence_id || geofence.id,
          type: geofence.rule_type || 'STAY_IN'
        };
      }
      
      // If not inside, calculate distance to nearest geofence
      if (geofencePolygons.length) {
        // Find closest polygon
        geofencePolygons.forEach(polygon => {
          const distance = distanceToPolygon(vehiclePosition, polygon);
          if (distance < minDistance) {
            minDistance = distance;
            nearestGeofence = {
              inside: false,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              distance: distance, // Distance in meters
              type: geofence.rule_type || 'STAY_IN'
            };
          }
        });
      }
    } catch (e) {
      console.error('Error processing geofence:', e);
    }
  }
  
  return nearestGeofence || { inside: false, name: null };
} 