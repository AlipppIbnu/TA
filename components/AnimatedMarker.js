// components/AnimatedMarker.js - FIXED VERSION untuk real-time GPS tracking
import { useEffect, useRef, useState } from 'react';
import { Marker } from 'react-leaflet';

// Enhanced AnimatedMarker component dengan complete GPS offline/online state handling
const AnimatedMarker = ({ position, ...markerProps }) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const startPositionRef = useRef(null);
  const lastValidPositionRef = useRef(null);
  const isInitializedRef = useRef(false);
  const hasReceivedValidPositionRef = useRef(false);
  const lastProcessedPositionRef = useRef(null); // NEW: Track last processed position

  // DEBUG: Log setiap kali position prop berubah
  useEffect(() => {
    console.log('🔄 AnimatedMarker: position prop changed:', position);
  }, [position]);

  // Inisialisasi posisi dan simpan sebagai referensi
  useEffect(() => {
    // Validasi posisi yang diterima
    if (!position || !Array.isArray(position) || position.length !== 2) {
      // Jika posisi invalid dan kita sudah punya posisi valid sebelumnya, 
      // JANGAN reset ke null - pertahankan posisi terakhir
      if (!hasReceivedValidPositionRef.current) {
        return;
      } else {
        return; // Jangan update apapun, biarkan currentPosition tetap seperti sebelumnya
      }
    }

    const [lat, lng] = position;
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      // Sama seperti di atas, jangan reset jika sudah punya posisi valid
      if (!hasReceivedValidPositionRef.current) {
        return;
      } else {
        return;
      }
    }

    // Cek apakah ini benar-benar posisi baru
    const positionKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (lastProcessedPositionRef.current === positionKey) {
      // Posisi sama, skip pemrosesan
      return;
    }
    lastProcessedPositionRef.current = positionKey;

    // Posisi valid diterima
    if (!isInitializedRef.current) {
      setCurrentPosition(position);
      lastValidPositionRef.current = position;
      startPositionRef.current = position;
      isInitializedRef.current = true;
      hasReceivedValidPositionRef.current = true;
      return;
    }

    // Update referensi posisi valid terakhir
    lastValidPositionRef.current = position;
    hasReceivedValidPositionRef.current = true;

  }, [position, currentPosition]); // FIXED: Added currentPosition to dependency array

  // Tangani update posisi dengan validasi ketat
  useEffect(() => {
    // Skip jika belum diinisialisasi
    if (!isInitializedRef.current || !hasReceivedValidPositionRef.current) return;

    // Validasi posisi yang akan diproses untuk animasi
    if (!position || !Array.isArray(position) || position.length !== 2) {
      return;
    }

    const [lat, lng] = position;
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return;
    }

    // Skip jika tidak ada currentPosition (belum initialized)
    if (!currentPosition) {
      setCurrentPosition(position);
      return;
    }

    // Cek apakah posisi benar-benar berubah dengan presisi tinggi untuk koordinat GPS
    const hasChanged = 
      Math.abs(position[0] - currentPosition[0]) > 0.0000001 ||
      Math.abs(position[1] - currentPosition[1]) > 0.0000001;

    if (!hasChanged) return;

    // Calculate distance for adaptive duration (GPS coordinates)
    const distance = Math.sqrt(
      Math.pow((position[0] - currentPosition[0]) * 111320, 2) + // Convert lat to meters
      Math.pow((position[1] - currentPosition[1]) * 111320 * Math.cos(position[0] * Math.PI / 180), 2) // Convert lng to meters
    );

    // Enhanced adaptive duration based on distance for GPS tracking
    let adaptiveDuration;
    if (distance < 1) {
      adaptiveDuration = 200;
    } else if (distance < 10) {
      adaptiveDuration = 500;
    } else if (distance < 100) {
      adaptiveDuration = 1000;
    } else if (distance < 1000) {
      adaptiveDuration = 1500;
    } else {
      // Pergerakan yang sangat besar - update langsung
      setCurrentPosition(position);
      lastValidPositionRef.current = position;
      return;
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Set up new animation
    startPositionRef.current = currentPosition;
    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / adaptiveDuration, 1);

      // Enhanced easing function for smoother vehicle movement
      let easeProgress;
      if (distance > 100) {
        easeProgress = progress;
      } else {
        easeProgress = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      }

      // Interpolate between start and end positions
      const lat = startPositionRef.current[0] + 
        (position[0] - startPositionRef.current[0]) * easeProgress;
      const lng = startPositionRef.current[1] + 
        (position[1] - startPositionRef.current[1]) * easeProgress;

      setCurrentPosition([lat, lng]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animasi selesai
        setCurrentPosition(position);
        lastValidPositionRef.current = position;
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [position, currentPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Jangan render sampai punya posisi yang valid
  if (!currentPosition || !Array.isArray(currentPosition) || currentPosition.length !== 2) {
    return null;
  }

  // Validasi akhir sebelum rendering
  const [lat, lng] = currentPosition;
  if (isNaN(lat) || isNaN(lng)) {
    // Gunakan posisi valid terakhir jika posisi saat ini invalid
    if (lastValidPositionRef.current && Array.isArray(lastValidPositionRef.current)) {
      const [lastLat, lastLng] = lastValidPositionRef.current;
      if (!isNaN(lastLat) && !isNaN(lastLng)) {
        return (
          <Marker
            {...markerProps}
            position={lastValidPositionRef.current}
          />
        );
      }
    }
    
    return null;
  }

  return (
    <Marker
      {...markerProps}
      position={currentPosition}
    />
  );
};

export default AnimatedMarker;