import React, { useState, useEffect } from 'react';
import GeofenceNotification from './GeofenceNotification';
import useGeofenceNotifications from './hooks/useGeofenceNotifications';

const GeofenceNotificationExample = () => {
  const {
    notifications,
    addNotification,
    removeNotification,
    removeAllNotifications,
    processGeofenceEvents
  } = useGeofenceNotifications(5, 8000); // Max 5 notifications, auto-remove after 8 seconds

  // Demo function to simulate geofence events
  const simulateGeofenceEvent = (eventType = 'exit') => {
    const demoEvents = {
      data: [
        {
          event_id: Date.now(),
          vehicle_id: Math.floor(Math.random() * 1000),
          geofence_id: Math.floor(Math.random() * 100),
          event_type: eventType,
          timestamp: new Date().toISOString(),
          // Additional demo data
          vehicle_name: `Kendaraan ${Math.floor(Math.random() * 10) + 1}`,
          geofence_name: `Area ${Math.floor(Math.random() * 5) + 1}`
        }
      ]
    };

    processGeofenceEvents(demoEvents);
  };

  // Demo function to add notification directly
  const addDemoNotification = (type = 'exit') => {
    const vehicleNames = [
      'Toyota Avanza (B 1234 ABC)',
      'Honda Civic (B 5678 DEF)', 
      'Mitsubishi Xpander (B 9012 GHI)',
      'Suzuki Ertiga (B 3456 JKL)',
      'Daihatsu Terios (B 7890 MNO)'
    ];

    const geofenceNames = [
      'Area Kantor Pusat',
      'Zona Industri Bekasi', 
      'Area Perumahan Elite',
      'Kawasan Komersial',
      'Area Restricted'
    ];

    addNotification({
      vehicle_id: Math.floor(Math.random() * 1000),
      vehicle_name: vehicleNames[Math.floor(Math.random() * vehicleNames.length)],
      geofence_id: Math.floor(Math.random() * 100),
      geofence_name: geofenceNames[Math.floor(Math.random() * geofenceNames.length)],
      event_type: type,
      timestamp: new Date().toISOString()
    });
  };

  // Auto demo notifications every 10 seconds (for testing)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 10 seconds
        const eventTypes = ['exit', 'enter'];
        const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        addDemoNotification(randomType);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Demo Notifikasi Geofence
          </h1>
          <p className="text-gray-600 mb-6">
            Contoh implementasi popup notifikasi untuk event kendaraan keluar dari geofence
          </p>

          {/* Demo Controls */}
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={() => addDemoNotification('exit')}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Simulasi: Keluar Geofence
            </button>
            
            <button
              onClick={() => addDemoNotification('enter')}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Simulasi: Masuk Geofence
            </button>
            
            <button
              onClick={() => simulateGeofenceEvent('exit')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Event API Keluar
            </button>
            
            <button
              onClick={removeAllNotifications}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Hapus Semua
            </button>
          </div>

          {/* Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <strong>Status:</strong> {notifications.length} notifikasi aktif
            </p>
            <p className="text-blue-600 text-sm mt-1">
              Notifikasi akan otomatis hilang setelah 8 detik
            </p>
          </div>
        </div>

        {/* Event Structure Documentation */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Struktur Data Event Geofence
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`{
  "data": [
    {
      "event_id": 1,
      "vehicle_id": 123,
      "geofence_id": 456,
      "event_type": "exit", // "exit", "enter", "exited", "entered"
      "timestamp": "2024-01-01T10:00:00Z",
      "vehicle_name": "Toyota Avanza (B 1234 ABC)", // opsional
      "geofence_name": "Area Kantor Pusat" // opsional
    }
  ]
}`}
            </pre>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="font-semibold text-gray-800">Event Types:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><span className="font-mono bg-red-100 px-2 py-1 rounded">exit/exited</span> - Kendaraan keluar dari geofence</li>
              <li><span className="font-mono bg-green-100 px-2 py-1 rounded">enter/entered</span> - Kendaraan masuk ke geofence</li>
            </ul>
          </div>
        </div>

        {/* Integration Example */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Cara Integrasi ke Dashboard
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`// Di komponen Dashboard
import GeofenceNotification from './components/GeofenceNotification';
import useGeofenceNotifications from './hooks/useGeofenceNotifications';

export default function Dashboard() {
  const {
    notifications,
    removeNotification,
    removeAllNotifications,
    processGeofenceEvents
  } = useGeofenceNotifications();

  // Saat menerima data event dari API
  useEffect(() => {
    // Polling atau WebSocket untuk event geofence
    const checkGeofenceEvents = async () => {
      const response = await fetch('/api/geofence-events');
      const eventData = await response.json();
      processGeofenceEvents(eventData);
    };

    const interval = setInterval(checkGeofenceEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Dashboard content */}
      
      {/* Notifikasi Geofence */}
      <GeofenceNotification
        notifications={notifications}
        onDismiss={removeNotification}
        onDismissAll={removeAllNotifications}
      />
    </div>
  );
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Notification Component */}
      <GeofenceNotification
        notifications={notifications}
        onDismiss={removeNotification}
        onDismissAll={removeAllNotifications}
      />
    </div>
  );
};

export default GeofenceNotificationExample; 