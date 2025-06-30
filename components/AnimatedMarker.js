// components/AnimatedMarker.js - FINAL CLEAN VERSION untuk GPS offline/online handling
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

  // FIXED: Initialize position immediately dan simpan sebagai referensi
  useEffect(() => {
    // Validasi posisi yang diterima
    if (!position || !Array.isArray(position) || position.length !== 2) {
      // CRITICAL FIX: Jika posisi invalid dan kita sudah punya posisi valid sebelumnya, 
      // JANGAN reset ke null - pertahankan posisi terakhir
      if (!hasReceivedValidPositionRef.current) {
        console.log('⚠️ Invalid position received, waiting for valid position');
        return;
      } else {
        console.log('⚠️ Invalid position received, keeping last valid position:', lastValidPositionRef.current);
        return; // Jangan update apapun, biarkan currentPosition tetap seperti sebelumnya
      }
    }

    const [lat, lng] = position;
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      // CRITICAL FIX: Sama seperti di atas, jangan reset jika sudah punya posisi valid
      if (!hasReceivedValidPositionRef.current) {
        console.log('⚠️ Invalid GPS coordinates, waiting for valid coordinates');
        return;
      } else {
        console.log('⚠️ Invalid GPS coordinates, keeping last valid position:', lastValidPositionRef.current);
        return;
      }
    }

    // FIXED: Posisi valid diterima
    if (!isInitializedRef.current) {
      console.log('🎯 AnimatedMarker: Initial valid position set (no animation):', position);
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

  }, [position]);

  // FIXED: Handle position updates dengan validasi ketat
  useEffect(() => {
    // Skip if not initialized yet
    if (!isInitializedRef.current || !hasReceivedValidPositionRef.current) return;

    // CRITICAL FIX: Validasi posisi yang akan diproses untuk animation
    if (!position || !Array.isArray(position) || position.length !== 2) {
      console.log('⚠️ Invalid position for animation, keeping current position');
      return;
    }

    const [lat, lng] = position;
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      console.log('⚠️ Invalid GPS coordinates for animation, keeping current position');
      return;
    }

    // Skip jika tidak ada currentPosition (belum initialized)
    if (!currentPosition) {
      console.log('🎯 Setting current position for animation:', position);
      setCurrentPosition(position);
      return;
    }

    // Check if position actually changed with higher precision for GPS coordinates
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
      // Very large movements - instant update
      console.log('📍 Large GPS jump detected, instant update:', distance.toFixed(2) + 'm');
      setCurrentPosition(position);
      lastValidPositionRef.current = position;
      return;
    }

    // Log movement for debugging
    if (process.env.NODE_ENV === 'development' && distance > 0.1) {
      console.log(`🚗 Vehicle moving: ${distance.toFixed(2)}m, animation: ${adaptiveDuration}ms`);
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
        // Animation completed
        setCurrentPosition(position);
        lastValidPositionRef.current = position;
        animationRef.current = null;
        
        if (process.env.NODE_ENV === 'development' && distance > 1) {
          console.log(`✅ Vehicle animation completed at: [${position[0].toFixed(6)}, ${position[1].toFixed(6)}]`);
        }
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

  // CRITICAL FIX: Don't render until we have a valid position
  if (!currentPosition || !Array.isArray(currentPosition) || currentPosition.length !== 2) {
    return null;
  }

  // CRITICAL FIX: Final validation before rendering
  const [lat, lng] = currentPosition;
  if (isNaN(lat) || isNaN(lng)) {
    console.warn('⚠️ Invalid position for rendering, using last valid position:', lastValidPositionRef.current);
    
    // LAST RESORT: Use last valid position if current is invalid
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