// lib/hooks/useWebSocket.js - Enhanced version with real-time GPS positioning
import { useEffect, useCallback, useRef, useState } from 'react';

const WEBSOCKET_URL = 'wss://vehitrack.my.id/websocket';
const RECONNECT_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const useWebSocket = () => {
  const wsRef = useRef(null);
  const [data, setData] = useState({ data: [] });
  const [alerts, setAlerts] = useState({ data: [] });
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const latestDataMapRef = useRef(new Map());
  const alertsCallbacksRef = useRef(new Set());

  // Enhanced connect function with better error handling
  const connect = useCallback(() => {
    // Prevent multiple connection attempts
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    console.log(`🔌 Attempting WebSocket connection... (Attempt ${reconnectAttemptsRef.current + 1})`);

    try {
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket Connected for GPS tracking');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to vehicle data stream for real-time positioning
        console.log('📡 Subscribing to vehicle_datas for real-time GPS updates...');
        ws.send(JSON.stringify({
          type: 'subscribe',
          collection: 'vehicle_datas'
        }));

        // Subscribe to alerts for real-time notifications
        console.log('🚨 Subscribing to alerts for real-time notifications...');
        ws.send(JSON.stringify({
          type: 'subscribe',
          collection: 'alerts'
        }));

        // Setup heartbeat to keep connection alive
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle pong response
          if (message.type === 'pong') {
            return;
          }

          // Handle subscription data for real-time updates
          if (message.type === 'subscription') {
            const { event, data: messageData, collection } = message;
            
            // Handle vehicle_datas subscription (GPS tracking)
            if (collection === 'vehicle_datas') {
              if (event === 'init' && messageData && Array.isArray(messageData)) {
                // Initial GPS data load
                console.log(`📥 Initial GPS data loaded: ${messageData.length} records`);
                
                // Process and store latest data for each GPS ID
                const dataMap = new Map();
                messageData.forEach(item => {
                  if (item.gps_id && item.latitude && item.longitude) {
                    const existing = dataMap.get(item.gps_id);
                    if (!existing || (item.timestamp && existing.timestamp && 
                        new Date(item.timestamp) > new Date(existing.timestamp))) {
                      dataMap.set(item.gps_id, item);
                    }
                  }
                });
                
                latestDataMapRef.current = dataMap;
                setData({ data: Array.from(dataMap.values()) });
                
              } else if ((event === 'create' || event === 'update') && messageData && messageData.length > 0) {
                // Real-time GPS update - THIS IS THE CORE FOR REALTIME MARKER MOVEMENT
                const newItem = messageData[0];
                
                if (newItem.gps_id && newItem.latitude && newItem.longitude) {
                  console.group('📍 REAL-TIME GPS UPDATE');
                  console.log('GPS ID:', newItem.gps_id);
                  console.log('New Position:', `${newItem.latitude}, ${newItem.longitude}`);
                  console.log('Speed:', newItem.speed || 0, 'km/h');
                  console.log('Timestamp:', newItem.timestamp);
                  
                  // Update the latest data map
                  latestDataMapRef.current.set(newItem.gps_id, newItem);
                  
                  // Update state with all latest data
                  setData({ data: Array.from(latestDataMapRef.current.values()) });
                  
                  console.log('✅ Marker position updated in real-time');
                  console.groupEnd();
                } else {
                  console.log('⚠️ Received invalid GPS data:', newItem);
                }
              }
            }
            
            // Handle alerts subscription (Real-time notifications)
            else if (collection === 'alerts') {
              if (event === 'init' && messageData && Array.isArray(messageData)) {
                console.log(`🚨 Initial alerts loaded: ${messageData.length} records`);
                setAlerts({ data: messageData });
              } else if (event === 'create' && messageData && messageData.length > 0) {
                const newAlert = messageData[0];
                console.group('🚨 REAL-TIME ALERT');
                console.log('Alert Type:', newAlert.alert_type);
                console.log('Message:', newAlert.alert_message);
                console.log('Vehicle ID:', newAlert.vehicle_id);
                console.log('Timestamp:', newAlert.timestamp);
                
                // Add new alert to existing alerts
                setAlerts(prev => ({ 
                  data: [newAlert, ...prev.data] 
                }));
                
                // Notify all registered callbacks
                alertsCallbacksRef.current.forEach(callback => {
                  try {
                    callback(newAlert);
                  } catch (error) {
                    console.error('Error in alert callback:', error);
                  }
                });
                
                console.log('✅ Real-time alert processed');
                console.groupEnd();
              }
            }
          }

          // Handle direct data updates (backward compatibility)
          else if (message.gps_id && message.latitude && message.longitude) {
            console.log('📍 Direct GPS update:', message.gps_id);
            latestDataMapRef.current.set(message.gps_id, message);
            setData({ data: Array.from(latestDataMapRef.current.values()) });
          }

        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket Error:', error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket Closed: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        wsRef.current = null;
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Auto-reconnect with exponential backoff
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttemptsRef.current - 1), 30000);
          
          console.log(`🔄 Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error('❌ Max reconnection attempts reached. Please refresh the page.');
        }
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, []);

  // Initialize connection
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnection requested...');
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Send message function
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('⚠️ WebSocket not connected. Message not sent:', message);
      return false;
    }
  }, []);

  // Get latest data for specific GPS ID
  const getLatestDataForGpsId = useCallback((gpsId) => {
    return latestDataMapRef.current.get(gpsId) || null;
  }, []);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    return {
      isConnected,
      reconnectAttempts: reconnectAttemptsRef.current,
      totalDataPoints: latestDataMapRef.current.size,
      alertsCount: alerts.data.length,
      readyState: wsRef.current?.readyState || WebSocket.CLOSED
    };
  }, [isConnected, alerts.data.length]);

  // Subscribe to alerts real-time updates
  const subscribeToAlerts = useCallback((callback) => {
    alertsCallbacksRef.current.add(callback);
    return () => {
      alertsCallbacksRef.current.delete(callback);
    };
  }, []);

  // Clear all alerts (for notifications page)
  const clearAlerts = useCallback(() => {
    setAlerts({ data: [] });
  }, []);

  return {
    // GPS/Vehicle data
    data,
    getLatestDataForGpsId,
    
    // Alerts data and functions (untuk notifications)
    alerts,
    subscribeToAlerts,
    clearAlerts,
    
    // Connection management
    isConnected,
    sendMessage,
    reconnect,
    getConnectionStats,
    ws: wsRef.current
  };
};