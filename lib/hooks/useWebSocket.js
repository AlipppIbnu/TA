import { useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';

const WEBSOCKET_URL = 'ws://ec2-13-229-83-7.ap-southeast-1.compute.amazonaws.com:8055';

export const useWebSocket = (path, options = {}) => {
  const wsRef = useRef(null);
  const { data, mutate } = useSWR(path, {
    ...options,
    refreshInterval: 0, // Disable polling since we're using WebSocket
  });

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(`${WEBSOCKET_URL}${path}`);

    ws.onopen = () => {
      // console.log('WebSocket Connected'); // Removed debugging log
    };

    ws.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        mutate(newData, false); // Update SWR cache without revalidation
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      // Fallback to HTTP polling on error
      mutate();
    };

    ws.onclose = () => {
      // console.log('WebSocket Disconnected - Retrying in 5s'); // Removed debugging log
      setTimeout(connect, 5000); // Retry connection after 5 seconds
    };

    wsRef.current = ws;
  }, [path, mutate]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Return both WebSocket instance and SWR data
  return {
    data,
    ws: wsRef.current,
    mutate,
  };
}; 