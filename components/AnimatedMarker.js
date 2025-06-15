import { useEffect, useRef, useState } from 'react';
import { Marker } from 'react-leaflet';

// Simple AnimatedMarker component for smooth movement only
const AnimatedMarker = ({ position, duration = 1500, ...markerProps }) => {
  const [currentPosition, setCurrentPosition] = useState(position);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const startPositionRef = useRef(position);

  useEffect(() => {
    if (!position || !currentPosition) return;

    // Check if position actually changed
    const hasChanged = 
      Math.abs(position[0] - currentPosition[0]) > 0.00001 ||
      Math.abs(position[1] - currentPosition[1]) > 0.00001;

    if (!hasChanged) return;

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
      const progress = Math.min(elapsed / duration, 1);

      // Simple easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 2);

      // Interpolate between start and end positions
      const lat = startPositionRef.current[0] + 
        (position[0] - startPositionRef.current[0]) * easeOut;
      const lng = startPositionRef.current[1] + 
        (position[1] - startPositionRef.current[1]) * easeOut;

      setCurrentPosition([lat, lng]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation completed
        setCurrentPosition(position);
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
  }, [position, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <Marker
      {...markerProps}
      position={currentPosition}
    />
  );
};

export default AnimatedMarker; 