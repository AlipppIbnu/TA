import { useState, useCallback, useRef, useEffect } from 'react';

const useGeofenceNotifications = (maxNotifications = 5, autoRemoveDelay = 5000) => {
  const [notifications, setNotifications] = useState([]);
  const notificationTimeouts = useRef({});

  // Function to add a new notification
  const addNotification = useCallback((eventData) => {
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event_id: eventData.event_id,
      vehicle_id: eventData.vehicle_id,
      vehicle_name: eventData.vehicle_name,
      geofence_id: eventData.geofence_id,
      geofence_name: eventData.geofence_name,
      event_type: eventData.event_type,
      timestamp: eventData.timestamp || new Date().toISOString(),
      isNew: true
    };

    setNotifications(prev => {
      // Remove oldest notifications if we exceed max
      const newNotifications = [notification, ...prev];
      if (newNotifications.length > maxNotifications) {
        const removed = newNotifications.slice(maxNotifications);
        // Clear timeouts for removed notifications
        removed.forEach(notif => {
          if (notificationTimeouts.current[notif.id]) {
            clearTimeout(notificationTimeouts.current[notif.id]);
            delete notificationTimeouts.current[notif.id];
          }
        });
        return newNotifications.slice(0, maxNotifications);
      }
      return newNotifications;
    });

    // Auto remove notification after delay
    if (autoRemoveDelay > 0) {
      notificationTimeouts.current[notification.id] = setTimeout(() => {
        removeNotification(notification.id);
      }, autoRemoveDelay);
    }

    return notification.id;
  }, [maxNotifications, autoRemoveDelay]);

  // Function to remove a specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    
    // Clear timeout if exists
    if (notificationTimeouts.current[notificationId]) {
      clearTimeout(notificationTimeouts.current[notificationId]);
      delete notificationTimeouts.current[notificationId];
    }
  }, []);

  // Function to remove all notifications
  const removeAllNotifications = useCallback(() => {
    setNotifications([]);
    
    // Clear all timeouts
    Object.values(notificationTimeouts.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    notificationTimeouts.current = {};
  }, []);

  // Function to process geofence events from API
  const processGeofenceEvents = useCallback((eventsData) => {
    if (!eventsData || !eventsData.data || !Array.isArray(eventsData.data)) {
      return;
    }

    eventsData.data.forEach(event => {
      // Only process events that indicate vehicle is outside geofence
      if (event.event_type && (event.event_type === 'exit' || event.event_type === 'exited' || event.event_type === 'outside')) {
        addNotification({
          event_id: event.event_id,
          vehicle_id: event.vehicle_id,
          vehicle_name: event.vehicle_name || `Kendaraan ${event.vehicle_id}`,
          geofence_id: event.geofence_id,
          geofence_name: event.geofence_name || `Geofence ${event.geofence_id}`,
          event_type: event.event_type,
          timestamp: event.timestamp
        });
      }
    });
  }, [addNotification]);

  // Function to check vehicle geofence status and create notifications
  const checkGeofenceStatus = useCallback((vehicles, geofences, lastStatusRef) => {
    if (!vehicles.length || !geofences.length) return;
    
    vehicles.forEach(vehicle => {
      if (!vehicle.position) return;
      
      const currentVehicleId = vehicle.vehicle_id;
      
      // Get geofence status using existing utility
      let vehicleGeofenceStatus = null;
      
      // Check if vehicle is inside any geofence
      for (const geofence of geofences) {
        // This is a simplified check - you might want to use the actual geofenceUtils
        const isInside = checkIfVehicleInsideGeofence(vehicle, geofence);
        
        if (isInside) {
          vehicleGeofenceStatus = {
            inside: true,
            name: geofence.name,
            id: geofence.geofence_id || geofence.id
          };
          break;
        }
      }
      
      // If not inside any geofence
      if (!vehicleGeofenceStatus) {
        vehicleGeofenceStatus = { inside: false, name: null };
      }
      
      // Generate key for this vehicle
      const statusKey = `${currentVehicleId}`;
      
      // Compare with previous status
      const prevStatus = lastStatusRef.current[statusKey];
      
      // If status changed to outside
      if (prevStatus !== undefined && prevStatus === true && !vehicleGeofenceStatus.inside) {
        // Vehicle exited geofence - create notification
        addNotification({
          vehicle_id: currentVehicleId,
          vehicle_name: `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.license_plate || vehicle.name || 'Unknown'})`.trim(),
          geofence_name: 'area yang ditentukan',
          event_type: 'exit',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update status for next check
      lastStatusRef.current[statusKey] = vehicleGeofenceStatus.inside;
    });
  }, [addNotification]);

  // Simplified geofence check function
  const checkIfVehicleInsideGeofence = (vehicle, geofence) => {
    // This is a placeholder - replace with actual geofence checking logic
    // You might want to import and use the geofenceUtils here
    return false; // Simplified for demo
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(notificationTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    removeAllNotifications,
    processGeofenceEvents,
    checkGeofenceStatus,
    notificationCount: notifications.length
  };
};

export default useGeofenceNotifications; 