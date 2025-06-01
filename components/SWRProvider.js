// components/SWRProvider.js - Global SWR Configuration
import { SWRConfig } from 'swr';

// Global SWR configuration
const swrConfig = {
  // Global fetcher function
  fetcher: async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate API response format
      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Log error for debugging
      console.error('SWR Fetcher Error:', {
        url,
        error: error.message,
        type: error.name
      });
      
      throw error;
    }
  },
  
  // Global options
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshWhenOffline: false,
  refreshWhenHidden: false,
  
  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  
  // Deduplication
  dedupingInterval: 2000,
  
  // Loading timeout
  loadingTimeout: 3000,
  
  // Global error handler
  onError: (error, key) => {
    console.error('SWR Global Error:', {
      key,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // You can add global error reporting here
    // e.g., send to error tracking service
  },
  
  // Global success handler
  onSuccess: (data, key) => {
    // Optional: Log successful requests for debugging - Removed in production
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('SWR Success:', {
    //     key,
    //     dataCount: data?.data?.length || 0,
    //     timestamp: new Date().toISOString()
    //   });
    // }
  }
};

// SWR Provider Component
export default function SWRProvider({ children }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}