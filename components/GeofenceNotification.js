import React, { useEffect, useState } from 'react';

const GeofenceNotification = ({ notification, onRemove, autoRemoveDelay = 10000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(autoRemoveDelay / 1000));

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);
    
    // Start countdown timer
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onRemove(notification.id, true); // true = manual dismissal
    }, 300); // Match animation duration
  };

  // Determine notification type and styling - only for violations
  const getNotificationStyle = () => {
    const eventType = notification.event_type || notification.alert_type;

    // Violation enter - KUNING/ORANGE (masuk area terlarang/forbidden)
    if (eventType === 'violation_enter') {
      return {
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-900',
        iconBg: 'bg-orange-200',
        iconColor: 'text-orange-700',
        progressColor: 'bg-orange-600',
        title: '⚠️ MASUK AREA TERLARANG',
        icon: '🚫'
      };
    }
    // Violation exit - MERAH (keluar dari area wajib/stay_in)
    else if (eventType === 'violation_exit') {
      return {
        bgColor: 'bg-red-100',
        borderColor: 'border-red-500',
        textColor: 'text-red-900',
        iconBg: 'bg-red-200',
        iconColor: 'text-red-700',
        progressColor: 'bg-red-600',
        title: '🚨 KELUAR AREA WAJIB',
        icon: '⛔'
      };
    }
    // Fallback (shouldn't happen with new filtering)
    else {
      return {
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-400',
        textColor: 'text-gray-800',
        iconBg: 'bg-gray-200',
        iconColor: 'text-gray-600',
        progressColor: 'bg-gray-500',
        title: '⚠️ PELANGGARAN GEOFENCE',
        icon: '⚠️'
      };
    }
  };

  const style = getNotificationStyle();

  // Generate message - prioritize alert_message from Directus
  const getMessage = () => {
    // Use alert_message from Directus alerts directly
    if (notification.alert_message) {
      return notification.alert_message;
    }

    // Fallback message generation (for backward compatibility)
    const vehicleName = notification.vehicle_name || 'Kendaraan';
    const geofenceName = notification.geofence_name || 'area geofence';
    const eventType = notification.event_type || notification.alert_type;
    
    switch (eventType) {
      case 'violation_enter':
        return `PELANGGARAN: ${vehicleName} memasuki area terlarang ${geofenceName}`;
      case 'violation_exit':
        return `PELANGGARAN: ${vehicleName} keluar dari area wajib ${geofenceName}`;
      default:
        return `PELANGGARAN: ${vehicleName} pada ${geofenceName}`;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Extract location from notification
  const getLocation = () => {
    if (notification.lokasi) {
      return notification.lokasi;
    }
    return 'Lokasi tidak tersedia';
  };

  // Calculate progress bar width based on countdown
  const progressWidth = countdown > 0 ? ((autoRemoveDelay / 1000 - countdown) / (autoRemoveDelay / 1000)) * 100 : 100;

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg shadow-lg border-l-4 p-1.5 mb-1.5 min-w-[180px] max-w-[220px]
        ${style.bgColor} ${style.borderColor} ${style.textColor}
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isClosing 
          ? 'translate-x-0 opacity-100 scale-100' 
          : isClosing 
            ? 'translate-x-full opacity-0 scale-95' 
            : 'translate-x-full opacity-0 scale-95'
        }
      `}
      style={{ 
        boxShadow: '0 6px 15px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 h-0.5 w-full bg-gray-200">
        <div 
          className={`h-full ${style.progressColor} transition-all duration-1000 ease-linear`}
          style={{ 
            width: `${progressWidth}%`
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className={`flex-shrink-0 w-4 h-4 rounded-full ${style.iconBg} flex items-center justify-center mr-1.5`}>
            <span className="text-xs">{style.icon}</span>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold mb-0.5">{style.title}</h4>
            <div className="flex items-center gap-0.5 text-xs opacity-75">
              <span>{formatTime(notification.timestamp)}</span>
              <span>•</span>
              <span>{formatDate(notification.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className={`
            flex-shrink-0 w-4 h-4 rounded-full ${style.iconBg} ${style.iconColor}
            flex items-center justify-center text-xs font-bold
            hover:opacity-75 transition-opacity duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current
          `}
          title="Tutup permanen (tidak akan muncul lagi)"
        >
          ×
        </button>
      </div>

      {/* Message */}
      <div className="mt-1">
        <p className="text-xs leading-3 font-semibold">
          {getMessage()}
        </p>
      </div>

      {/* Details */}
      <div className="mt-1 pt-1 border-t border-current border-opacity-20">
        <div className="grid grid-cols-1 gap-0.5 text-xs opacity-75">
          <div className="flex justify-between">
            <span className="font-medium text-xs">Kendaraan:</span>
            <span className="font-mono text-xs">{notification.vehicle_name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-xs">Geofence:</span>
            <span className="font-mono text-xs">{notification.geofence_name || 'N/A'}</span>
          </div>
          {notification.lokasi && (
            <div className="flex justify-between">
              <span className="font-medium text-xs">Koordinat:</span>
              <span className="font-mono text-xs">{getLocation()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Violation type badge */}
      <div className="mt-1 flex items-center justify-center">
        <div className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${style.iconBg} ${style.iconColor}`}>
          <span className="mr-0.5 text-xs">{style.icon}</span>
          <span className="text-xs">{notification.event_type === 'violation_enter' ? 'Area Terlarang' : 'Area Wajib'}</span>
        </div>
      </div>

      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ 
          backgroundImage: `radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px),
                           radial-gradient(circle at 80% 50%, currentColor 1px, transparent 1px)`,
          backgroundSize: '16px 16px'
        }}
      />
    </div>
  );
};

export default GeofenceNotification;

