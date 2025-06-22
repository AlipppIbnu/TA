import { useState, useCallback, useRef, useEffect } from 'react';

const useGeofenceNotifications = (maxNotifications = 5, autoRemoveDelay = 8000) => {
  const [notifications, setNotifications] = useState([]);
  const notificationTimeouts = useRef({});
  const lastFetchedTimestamp = useRef(null);

  // Function to remove a specific notification
  const removeNotification = useCallback((alertId) => {
    setNotifications(prev => prev.filter(notif => notif.alert_id !== alertId));
    
    // Clear timeout if exists
    if (notificationTimeouts.current[alertId]) {
      clearTimeout(notificationTimeouts.current[alertId]);
      delete notificationTimeouts.current[alertId];
    }
  }, []);

  // Function to add a new notification
  const addNotification = useCallback((alert) => {
    setNotifications(prev => {
      // Check if alert already exists
      if (prev.some(notif => notif.alert_id === alert.alert_id)) {
        return prev;
      }

      // Remove oldest notifications if we exceed max
      const newNotifications = [alert, ...prev];
      if (newNotifications.length > maxNotifications) {
        const removed = newNotifications.slice(maxNotifications);
        // Clear timeouts for removed notifications
        removed.forEach(notif => {
          if (notificationTimeouts.current[notif.alert_id]) {
            clearTimeout(notificationTimeouts.current[notif.alert_id]);
            delete notificationTimeouts.current[notif.alert_id];
          }
        });
        return newNotifications.slice(0, maxNotifications);
      }
      return newNotifications;
    });

    // Auto remove notification after delay
    if (autoRemoveDelay > 0) {
      notificationTimeouts.current[alert.alert_id] = setTimeout(() => {
        removeNotification(alert.alert_id);
      }, autoRemoveDelay);
    }

    return alert.alert_id;
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

  // Function to fetch alerts from Directus
  const fetchAlerts = useCallback(async () => {
    try {
      const timestamp = lastFetchedTimestamp.current || new Date().toISOString();
      const response = await fetch(`http://vehitrack.my.id/directus/items/alerts?filter[timestamp][_gt]=${timestamp}&sort=-timestamp&limit=${maxNotifications}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        // Update last fetched timestamp
        const latestAlert = data.data[0];
        if (latestAlert) {
          lastFetchedTimestamp.current = latestAlert.timestamp;
        }

        // Add new alerts
        data.data.forEach(alert => {
          addNotification(alert);
        });
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, [addNotification, maxNotifications]);

  // Set up polling interval
  useEffect(() => {
    // Initial fetch
    fetchAlerts();

    // Set up polling interval (every 5 seconds)
    const interval = setInterval(fetchAlerts, 5000);

    return () => {
      clearInterval(interval);
      // Clear all timeouts on unmount
      Object.values(notificationTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [fetchAlerts]);

  return {
    notifications,
    removeNotification,
    removeAllNotifications
  };
};

export default useGeofenceNotifications; 