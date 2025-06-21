import { useEffect, useCallback, useRef, useState } from 'react';

const WEBSOCKET_URL = 'ws://vehitrack.my.id/websocket';

export const useWebSocket = () => {
  const wsRef = useRef(null);
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Tutup koneksi yang ada jika masih ada
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket Connected');
      
      // Subscribe ke channel vehicle_data
      ws.send(JSON.stringify({
        type: 'subscribe',
        collection: 'vehicle_datas'
      }));

      // Setup heartbeat setiap 30 detik
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        
        // Handle different message types
        if (newData.type === 'pong') {
          // Heartbeat response
          return;
        }
        
        // Update data state
        setData(prevData => {
          // If it's the first data or complete refresh
          if (!prevData || newData.type === 'refresh') {
            return newData;
          }
          
          // Merge new data with existing data
          return {
            ...prevData,
            data: [...(prevData.data || []), ...(newData.data || [])]
          };
        });
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected - Retrying in 5s');
      setIsConnected(false);
      
      // Clear intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // Clear existing timeout if any
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Set new reconnect timeout
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Fungsi untuk mengirim pesan ke server
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    data,
    isConnected,
    sendMessage,
    ws: wsRef.current
  };
}; 