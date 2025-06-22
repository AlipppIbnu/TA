import React, { useEffect, useState } from 'react';

const GeofenceNotification = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onRemove(notification.alert_id);
    }, 300); // Match animation duration
  };

  // Determine notification type and styling
  const getNotificationStyle = () => {
    const alertType = notification.alert_type;
    
    // Violation enter - KUNING (masuk area terlarang/forbidden)
    if (alertType === 'violation_enter') {
      return {
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-900',
        iconBg: 'bg-yellow-200',
        iconColor: 'text-yellow-700',
        progressColor: 'bg-yellow-600',
        title: 'MASUK AREA TERLARANG'
      };
    }
    // Violation exit - MERAH BANGET (keluar dari area wajib/stay_in)
    else {
        return {
        bgColor: 'bg-red-100',
        borderColor: 'border-red-500',
          textColor: 'text-red-900',
        iconBg: 'bg-red-200',
        iconColor: 'text-red-700',
        progressColor: 'bg-red-600',
        title: 'KELUAR AREA WAJIB'
        };
    }
  };

  const style = getNotificationStyle();

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
          
          return (
            <div
              className={`
        relative overflow-hidden rounded-lg shadow-lg border-l-4 p-4 mb-3 min-w-[320px] max-w-[400px]
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
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)'
              }}
            >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 h-1 w-full bg-gray-200">
        <div 
          className={`h-full ${style.progressColor} transition-all duration-8000 ease-linear`}
                  style={{ 
            width: isVisible ? '0%' : '100%',
            animationDelay: '100ms'
                  }}
        />
                    </div>
                    
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center mr-3`}>
            <div className={`w-3 h-3 rounded-full ${style.progressColor}`} />
                    </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold mb-1">{style.title}</h4>
            <p className="text-xs opacity-75">{formatTime(notification.timestamp)}</p>
                  </div>
                </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className={`
            flex-shrink-0 w-6 h-6 rounded-full ${style.iconBg} ${style.iconColor}
            flex items-center justify-center text-sm font-bold
            hover:opacity-75 transition-opacity duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current
          `}
        >
          ×
        </button>
      </div>

      {/* Message */}
      <div className="mt-3">
        <p className="text-sm leading-5 font-medium">
          {notification.alert_message}
                  </p>
                </div>

      {/* Details */}
      <div className="mt-3 pt-3 border-t border-current border-opacity-20">
        <div className="grid grid-cols-1 gap-1 text-xs opacity-75">
          <div className="flex justify-between">
            <span>Vehicle ID:</span>
            <span className="font-mono">{notification.vehicle_id}</span>
          </div>
          <div className="flex justify-between">
            <span>Lokasi:</span>
            <span className="font-mono">{notification.lokasi}</span>
                  </div>
                </div>
              </div>

      {/* Subtle background pattern */}
              <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ 
          backgroundImage: `radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px),
                           radial-gradient(circle at 80% 50%, currentColor 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
                }}
              />
            </div>
  );
};

export default GeofenceNotification; 