import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Shield, Clock, Car } from 'lucide-react';

const GeofenceNotification = ({ 
  notifications = [], 
  onDismiss, 
  onDismissAll 
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  const handleDismiss = (notificationId) => {
    setVisibleNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isExiting: true }
          : notif
      )
    );

    setTimeout(() => {
      setVisibleNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
      onDismiss && onDismiss(notificationId);
    }, 300);
  };

  const handleDismissAll = () => {
    setVisibleNotifications(prev => 
      prev.map(notif => ({ ...notif, isExiting: true }))
    );

    setTimeout(() => {
      setVisibleNotifications([]);
      onDismissAll && onDismissAll();
    }, 300);
  };

  const getNotificationConfig = (eventType) => {
    switch (eventType) {
      case 'exit':
      case 'exited':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          title: 'Kendaraan Keluar Area',
          bgGradient: 'bg-gradient-to-r from-red-50 to-red-100',
          borderColor: 'border-l-red-500',
          accentColor: 'bg-red-500',
          textColor: 'text-red-900',
          iconBg: 'bg-red-100',
          shadowColor: 'shadow-red-100'
        };
      case 'enter':
      case 'entered':
        return {
          icon: <Shield className="w-5 h-5 text-green-600" />,
          title: 'Kendaraan Masuk Area',
          bgGradient: 'bg-gradient-to-r from-green-50 to-green-100',
          borderColor: 'border-l-green-500',
          accentColor: 'bg-green-500',
          textColor: 'text-green-900',
          iconBg: 'bg-green-100',
          shadowColor: 'shadow-green-100'
        };
      default:
        return {
          icon: <Car className="w-5 h-5 text-blue-600" />,
          title: 'Event Geofence',
          bgGradient: 'bg-gradient-to-r from-blue-50 to-blue-100',
          borderColor: 'border-l-blue-500',
          accentColor: 'bg-blue-500',
          textColor: 'text-blue-900',
          iconBg: 'bg-blue-100',
          shadowColor: 'shadow-blue-100'
        };
    }
  };

  const getNotificationMessage = (notification) => {
    const { event_type, vehicle_name, geofence_name } = notification;
    
    switch (event_type) {
      case 'exit':
      case 'exited':
        return `${vehicle_name || 'Kendaraan'} telah keluar dari ${geofence_name || 'area geofence'}`;
      case 'enter':
      case 'entered':
        return `${vehicle_name || 'Kendaraan'} telah memasuki ${geofence_name || 'area geofence'}`;
      default:
        return `Event ${event_type || 'unknown'} pada ${vehicle_name || 'kendaraan'}`;
    }
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-xs w-full">
        {/* Dismiss All Button */}
        {visibleNotifications.length > 1 && (
          <div className="flex justify-end mb-1">
            <button
              onClick={handleDismissAll}
              className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-2.5 py-1 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm font-medium"
            >
              Tutup Semua ({visibleNotifications.length})
            </button>
          </div>
        )}

        {/* Notifications */}
        {visibleNotifications.map((notification, index) => {
          const config = getNotificationConfig(notification.event_type);
          const message = getNotificationMessage(notification);
          
          return (
            <div
              key={notification.id}
              className={`
                relative overflow-hidden bg-white rounded-lg shadow-md border border-gray-200 border-l-4 ${config.borderColor}
                transform transition-all duration-300 ease-out
                ${notification.isExiting 
                  ? 'translate-x-full opacity-0 scale-95' 
                  : 'translate-x-0 opacity-100 scale-100'
                }
                hover:shadow-lg hover:-translate-y-0.5
                animate-slideIn
              `}
              style={{ 
                animationDelay: `${index * 100}ms`,
                maxWidth: '320px'
              }}
            >
              {/* Main Content */}
              <div className="p-3 relative">
                {/* Close Button - Simple red X */}
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="absolute top-1 right-1 text-red-500 hover:text-red-500 focus:outline-none"
                  style={{ 
                    padding: '2px', 
                    width: '20px', 
                    height: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none'
                  }}
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Header Section */}
                <div className="flex items-start mb-2 pr-7">
                  <div className="flex items-start space-x-2.5">
                    {/* Icon Container */}
                    <div className={`p-1.5 rounded-lg ${config.iconBg} flex-shrink-0`}>
                      {config.icon}
                    </div>
                    
                    {/* Title and Alert Badge */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-sm ${config.textColor} leading-tight mb-1`}>
                        {config.title}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        🚨 ALERT GEOFENCE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Section */}
                <div className="mb-2">
                  <p className={`text-xs leading-relaxed ${config.textColor} font-medium`}>
                    {message}
                  </p>
                </div>

                {/* Footer Section */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">
                      {notification.timestamp 
                        ? new Date(notification.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Sekarang'
                      }
                    </span>
                  </div>
                  
                  {notification.vehicle_id && (
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">
                      {notification.vehicle_id}
                    </span>
                  )}
                </div>
              </div>

              {/* Subtle Animation Accent */}
              <div 
                className={`absolute left-0 top-0 w-1 h-full ${config.accentColor} opacity-0 animate-pulse`}
                style={{ 
                  animation: 'accentPulse 2s ease-in-out infinite',
                  animationDelay: `${index * 200}ms`
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Enhanced CSS Animations */}
      <style jsx>{`
        @keyframes slideIn {
          from { 
            transform: translateX(100%);
            opacity: 0;
          }
          to { 
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes accentPulse {
          0%, 100% { 
            opacity: 0.3;
          }
          50% { 
            opacity: 0.8;
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default GeofenceNotification; 