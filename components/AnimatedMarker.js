import { useEffect, useRef, useState } from 'react';
import { Marker } from 'react-leaflet';

// AnimatedMarker component with optimized smooth movement
const AnimatedMarker = ({ position, duration = 500, ...markerProps }) => {
  const [currentPosition, setCurrentPosition] = useState(position);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const startPositionRef = useRef(position);

  useEffect(() => {
    if (!position || !currentPosition) return;

    // Check if position actually changed and is significant enough to animate
    const hasChanged = 
      Math.abs(position[0] - currentPosition[0]) > 0.000001 ||
      Math.abs(position[1] - currentPosition[1]) > 0.000001;

    if (!hasChanged) return;

    // Calculate distance for adaptive duration
    const distance = Math.sqrt(
      Math.pow(position[0] - currentPosition[0], 2) +
      Math.pow(position[1] - currentPosition[1], 2)
    );

    // Adjust duration based on distance (longer distance = longer animation)
    const adaptiveDuration = Math.min(
      Math.max(distance * 5000, 200), // minimum 200ms, scales with distance
      1000 // maximum 1000ms
    );

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

      // Cubic easing function for smoother animation
      const easeInOutCubic = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Interpolate between start and end positions
      const lat = startPositionRef.current[0] + 
        (position[0] - startPositionRef.current[0]) * easeInOutCubic;
      const lng = startPositionRef.current[1] + 
        (position[1] - startPositionRef.current[1]) * easeInOutCubic;

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
  }, [position, duration, currentPosition]);

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