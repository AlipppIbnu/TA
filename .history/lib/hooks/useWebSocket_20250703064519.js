// lib/hooks/useWebSocket.js - Fixed to handle large data and show latest position immediately
import { useEffect, useCallback, useRef, useState } from 'react';

const WEBSOCKET_URL = 'wss://vehitrack.my.id/websocket';
const RECONNECT_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_DATA_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useWebSocket = () => {
  const wsRef = useRef(null);
  const [data, setData] = useState({ data: [] });
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const latestDataMapRef = useRef(new Map());
  const isProcessingRef = useRef(false);

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
            sort: ['-timestamp'],  // Sort by timestamp descending (newest first)
            filter: {
              timestamp: {
                _gte: new Date(Date.now() - MAX_DATA_AGE).toISOString() // Only last 24 hours
              }
            }
          }
        }));

        // Setup heartbeat to keep connection alive
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = async (event) => {
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
              // Prevent concurrent processing
              if (isProcessingRef.current) {
                console.log('⚠️ Already processing data, skipping...');
                return;
              }
              
              isProcessingRef.current = true;
              
              // Initial data load - PROCESS ONLY THE LATEST DATA FOR EACH GPS_ID
              console.log(`📥 Initial GPS data received: ${messageData.length} records`);
              
              // Filter out invalid timestamps and old data
              const now = Date.now();
              const validData = messageData.filter(item => {
                if (!item.timestamp) return false;
                
                const timestamp = new Date(item.timestamp).getTime();
                // Filter out future dates and very old data
                return timestamp <= now && timestamp > (now - MAX_DATA_AGE);
              });
              
              console.log(`📊 Valid data after filtering: ${validData.length} records`);
              
              // Sort data by timestamp descending (newest first)
              const sortedData = validData.sort((a, b) => {
                const timeA = new Date(a.timestamp || 0).getTime();
                const timeB = new Date(b.timestamp || 0).getTime();
                return timeB - timeA; // Newest first
              });
              
              // Group data by GPS ID and find the latest record for each
              const latestDataByGpsId = new Map();
              
              // Process sorted data to get only the first (latest) entry for each GPS ID
              sortedData.forEach(item => {
                if (item.gps_id && item.latitude && item.longitude) {
                  // Only add if we haven't seen this GPS ID yet (since we're processing newest first)
                  if (!latestDataByGpsId.has(item.gps_id)) {
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
              
              isProcessingRef.current = false;
              
            } else if ((event === 'create' || event === 'update') && messageData && messageData.length > 0) {
              // Real-time update - THIS IS THE CORE FOR REALTIME MARKER MOVEMENT
              const newItem = messageData[0];
              
              if (newItem.gps_id && newItem.latitude && newItem.longitude) {
                console.group('📍 REAL-TIME GPS UPDATE');
                console.log('GPS ID:', newItem.gps_id);
                console.log('New Position:', `${newItem.latitude}, ${newItem.longitude}`);
                console.log('Speed:', newItem.speed || 0, 'km/h');
                console.log('Timestamp:', newItem.timestamp);
                
                // Validate timestamp
                const timestamp = new Date(newItem.timestamp).getTime();
                const now = Date.now();
                
                if (timestamp > now || timestamp < (now - MAX_DATA_AGE)) {
                  console.log('⚠️ Skipping update with invalid timestamp');
                  console.groupEnd();
                  return;
                }
                
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
            
            // Validate timestamp
            if (message.timestamp) {
              const timestamp = new Date(message.timestamp).getTime();
              const now = Date.now();
              
              if (timestamp > now || timestamp < (now - MAX_DATA_AGE)) {
                console.log('⚠️ Skipping direct update with invalid timestamp');
                return;
              }
            }
            
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
          isProcessingRef.current = false;
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