import { useState, useCallback, useRef, useEffect } from 'react';
import { handleGeofenceViolation } from '@/utils/geofenceApi';

const useGeofenceNotifications = (maxNotifications = 5, autoRemoveDelay = 8000) => {
  const [notifications, setNotifications] = useState([]);
  const notificationTimeouts = useRef({});

  // Function to remove a specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    
    // Clear timeout if exists
    if (notificationTimeouts.current[notificationId]) {
      clearTimeout(notificationTimeouts.current[notificationId]);
      delete notificationTimeouts.current[notificationId];
    }
  }, []);

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
  }, [maxNotifications, autoRemoveDelay, removeNotification]);

  // Function to remove all notifications
  const removeAllNotifications = useCallback(() => {
    setNotifications([]);
    
    // Clear all timeouts
    Object.values(notificationTimeouts.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    notificationTimeouts.current = {};
  }, []);

  // Function to process geofence events from API and save to Directus
  const processGeofenceEventsWithSave = useCallback(async (eventsData, shouldSaveToDirectus = false) => {
    if (!eventsData || !eventsData.data || !Array.isArray(eventsData.data)) {
      return;
    }

    for (const event of eventsData.data) {
      // Process all events for notifications
      if (event.event_type && (
        event.event_type === 'exit' || 
        event.event_type === 'exited' || 
        event.event_type === 'enter' ||
        event.event_type === 'entered' ||
        event.event_type === 'outside'
      )) {
        // Add custom notification
        addNotification({
          event_id: event.event_id,
          vehicle_id: event.vehicle_id,
          vehicle_name: event.vehicle_name || `Kendaraan ${event.vehicle_id}`,
          geofence_id: event.geofence_id,
          geofence_name: event.geofence_name || `Geofence ${event.geofence_id}`,
          event_type: event.event_type,
          timestamp: event.timestamp
        });

        // Optionally save to Directus if requested
        if (shouldSaveToDirectus && event.vehicle_data && event.geofence_data) {
          try {
            const result = await handleGeofenceViolation({
              eventType: event.event_type.replace('ed', ''), // convert 'entered' to 'enter', 'exited' to 'exit'
              vehicle: event.vehicle_data,
              geofence: event.geofence_data,
              timestamp: event.timestamp
            });

            console.log('📝 Processed event with Directus save:', {
              eventId: event.event_id,
              success: result.success,
              isViolation: result.isViolation
            });
          } catch (error) {
            console.error('Error saving geofence event to Directus:', error);
          }
        }
      }
    }
  }, [addNotification]);

  // Legacy function for backward compatibility
  const processGeofenceEvents = useCallback((eventsData) => {
    return processGeofenceEventsWithSave(eventsData, false);
  }, [processGeofenceEventsWithSave]);

  // Function to check vehicle geofence status and create notifications with Directus integration
  const checkGeofenceStatusWithSave = useCallback(async (vehicles, geofences, lastStatusRef) => {
    if (!vehicles.length || !geofences.length) return;
    
    for (const vehicle of vehicles) {
      if (!vehicle.position) continue;
      
      const currentVehicleId = vehicle.vehicle_id;
      
      // Get geofence status using existing utility
      let vehicleGeofenceStatus = null;
      let matchedGeofence = null;
      
      // Check if vehicle is inside any geofence
      for (const geofence of geofences) {
        // This should use the actual geofenceUtils
        const isInside = checkIfVehicleInsideGeofence(vehicle, geofence);
        
        if (isInside) {
          vehicleGeofenceStatus = {
            inside: true,
            name: geofence.name,
            id: geofence.geofence_id || geofence.id
          };
          matchedGeofence = geofence;
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
      
      // If status changed
      if (prevStatus !== undefined && prevStatus !== vehicleGeofenceStatus.inside) {
        const timestamp = new Date().toISOString();
        const eventType = vehicleGeofenceStatus.inside ? 'enter' : 'exit';
        const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.license_plate || vehicle.name || 'Unknown'})`.trim();
        
        // Add custom notification
        addNotification({
          vehicle_id: currentVehicleId,
          vehicle_name: vehicleName,
          geofence_name: vehicleGeofenceStatus.name || 'area yang ditentukan',
          event_type: eventType,
          timestamp: timestamp
        });

        // Save to Directus if geofence is matched
        if (matchedGeofence) {
          try {
            const vehicleData = {
              vehicle_id: currentVehicleId,
              vehicle_name: vehicleName,
              name: vehicle.name,
              make: vehicle.make,
              model: vehicle.model,
              license_plate: vehicle.license_plate,
              position: vehicle.position
            };

            const geofenceData = {
              geofence_id: matchedGeofence.geofence_id || matchedGeofence.id,
              geofence_name: matchedGeofence.name,
              name: matchedGeofence.name,
              rule_type: matchedGeofence.rule_type || 'STAY_IN'
            };

            await handleGeofenceViolation({
              eventType: eventType,
              vehicle: vehicleData,
              geofence: geofenceData,
              timestamp: timestamp
            });
          } catch (error) {
            console.error('Error saving geofence status change:', error);
          }
        }
      }
      
      // Update status for next check
      lastStatusRef.current[statusKey] = vehicleGeofenceStatus.inside;
    }
  }, [addNotification]);

  // Legacy function for backward compatibility
  const checkGeofenceStatus = useCallback((vehicles, geofences, lastStatusRef) => {
    // For backward compatibility, call the new function without await
    checkGeofenceStatusWithSave(vehicles, geofences, lastStatusRef).catch(error => {
      console.error('Error in checkGeofenceStatus:', error);
    });
  }, [checkGeofenceStatusWithSave]);

  // Simplified geofence check function
  const checkIfVehicleInsideGeofence = (/* vehicle, geofence */) => {
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
    processGeofenceEventsWithSave,
    checkGeofenceStatus,
    checkGeofenceStatusWithSave,
    notificationCount: notifications.length
  };
};

export default useGeofenceNotifications; 