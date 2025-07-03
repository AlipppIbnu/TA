// lib/hooks/useWebSocket.js - Fixed to show latest position immediately
import { useEffect, useCallback, useRef, useState } from 'react';

const WEBSOCKET_URL = 'wss://vehitrack.my.id/websocket';
const RECONNECT_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const useWebSocket = () => {
  const wsRef = useRef(null);
  const [data, setData] = useState({ data: [] });
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const latestDataMapRef = useRef(new Map());

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
          collection: 'vehicle_datas',
          query: {
            limit: -1,  // Get all data
            sort: ['-timestamp']  // Sort by timestamp descending (newest first)
          }
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
            const { event, data: messageData } = message;
            
            if (event === 'init' && messageData && Array.isArray(messageData)) {
              // Initial data load - PROCESS ONLY THE LATEST DATA FOR EACH GPS_ID
              console.log(`📥 Initial GPS data received: ${messageData.length} records`);
              
              // Group data by GPS ID and find the latest record for each
              const latestDataByGpsId = new Map();
              
              // Process all data to find the latest timestamp for each GPS ID
              messageData.forEach(item => {
                if (item.gps_id && item.latitude && item.longitude) {
                  const existing = latestDataByGpsId.get(item.gps_id);
                  
                  // Compare timestamps to keep only the latest
                  if (!existing || !existing.timestamp || !item.timestamp ||
                      new Date(item.timestamp) > new Date(existing.timestamp)) {
                    latestDataByGpsId.set(item.gps_id, {
                      ...item,
                      isLatestData: true // Mark as latest data
                    });
                  }
                }
              });
              
              console.log(`🎯 Processed latest positions for ${latestDataByGpsId.size} GPS devices`);
              
              // Log the latest positions for debugging
              latestDataByGpsId.forEach((data, gpsId) => {
                console.log(`📍 GPS ${gpsId}: Latest position at ${data.timestamp}`);
              });
              
              // Update our reference map and state with only the latest data
              latestDataMapRef.current = latestDataByGpsId;
              setData({ 
                data: Array.from(latestDataByGpsId.values()),
                timestamp: new Date().toISOString(),
                isInitialLoad: true // Flag to indicate this is the initial load
              });
              
            } else if ((event === 'create' || event === 'update') && messageData && messageData.length > 0) {
              // Real-time update - THIS IS THE CORE FOR REALTIME MARKER MOVEMENT
              const newItem = messageData[0];
              
              if (newItem.gps_id && newItem.latitude && newItem.longitude) {
                console.group('📍 REAL-TIME GPS UPDATE');
                console.log('GPS ID:', newItem.gps_id);
                console.log('New Position:', `${newItem.latitude}, ${newItem.longitude}`);
                console.log('Speed:', newItem.speed || 0, 'km/h');
                console.log('Timestamp:', newItem.timestamp);
                
                // Update the latest data map with real-time flag
                latestDataMapRef.current.set(newItem.gps_id, {
                  ...newItem,
                  isRealTimeUpdate: true // Mark as real-time update
                });
                
                // Update state with all latest data + timestamp to force re-render
                setData({ 
                  data: Array.from(latestDataMapRef.current.values()),
                  timestamp: new Date().toISOString(),
                  isRealTimeUpdate: true // Flag to indicate this is a real-time update
                });
                
                console.log('✅ Marker position updated in real-time');
                console.groupEnd();
              } else {
                console.log('⚠️ Received invalid GPS data:', newItem);
              }
            }
          }

          // Handle direct data updates (backward compatibility)
          else if (message.gps_id && message.latitude && message.longitude) {
            console.log('📍 Direct GPS update:', message.gps_id);
            latestDataMapRef.current.set(message.gps_id, {
              ...message,
              isDirectUpdate: true
            });
            setData({ 
              data: Array.from(latestDataMapRef.current.values()),
              timestamp: new Date().toISOString()
            });
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
      readyState: wsRef.current?.readyState || WebSocket.CLOSED
    };
  }, [isConnected]);

  return {
    data,
    isConnected,
    sendMessage,
    reconnect,
    getLatestDataForGpsId,
    getConnectionStats,
    ws: wsRef.current
  };
};