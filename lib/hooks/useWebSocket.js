// Hook WebSocket untuk positioning GPS real-time
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

  // Fungsi connect yang ditingkatkan dengan penanganan error yang lebih baik
  const connect = useCallback(() => {
    // Cegah beberapa upaya koneksi bersamaan
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Tutup koneksi yang ada jika ada
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe ke stream data kendaraan untuk positioning real-time
        ws.send(JSON.stringify({
          type: 'subscribe',
          collection: 'vehicle_datas'
        }));

        // Setup heartbeat untuk menjaga koneksi tetap hidup
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle respon pong
          if (message.type === 'pong') {
            return;
          }

          // Handle data subscription untuk update real-time
          if (message.type === 'subscription') {
            const { event, data: messageData } = message;
            
            if (event === 'init' && messageData && Array.isArray(messageData)) {
              // Load data awal
              
              // Proses dan simpan data terbaru untuk setiap GPS ID
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
              setData({ 
                data: Array.from(dataMap.values()),
                timestamp: new Date().toISOString()
              });
              
            } else if ((event === 'create' || event === 'update') && messageData && messageData.length > 0) {
              // Update real-time - INTI UNTUK PERGERAKAN MARKER REAL-TIME
              const newItem = messageData[0];
              
              if (newItem.gps_id && newItem.latitude && newItem.longitude) {
                // Update peta data terbaru
                latestDataMapRef.current.set(newItem.gps_id, newItem);
                
                // Update state dengan semua data terbaru + timestamp untuk memaksa re-render
                setData({ 
                  data: Array.from(latestDataMapRef.current.values()),
                  timestamp: new Date().toISOString()
                });
              }
            }
          }

          // Handle update data langsung (backward compatibility)
          else if (message.gps_id && message.latitude && message.longitude) {
            latestDataMapRef.current.set(message.gps_id, message);
            setData({ 
              data: Array.from(latestDataMapRef.current.values()),
              timestamp: new Date().toISOString()
            });
          }

        } catch (error) {
          console.error('Gagal parse pesan WebSocket:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Error WebSocket:', error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;
        
        // Bersihkan heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Auto-reconnect dengan exponential backoff
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttemptsRef.current - 1), 30000);
          
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error('Batas maksimum upaya reconnect tercapai. Silakan refresh halaman.');
        }
      };

    } catch (error) {
      console.error('Gagal membuat koneksi WebSocket:', error);
      setIsConnected(false);
    }
  }, []);

  // Inisialisasi koneksi
  useEffect(() => {
    connect();

    // Cleanup saat unmount
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

  // Fungsi reconnect manual
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Fungsi kirim pesan
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      return false;
    }
  }, []);

  // Dapatkan data terbaru untuk GPS ID spesifik
  const getLatestDataForGpsId = useCallback((gpsId) => {
    return latestDataMapRef.current.get(gpsId) || null;
  }, []);

  // Dapatkan statistik koneksi
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