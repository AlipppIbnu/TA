import { useState, useCallback, useRef, useEffect } from 'react';
import { handleGeofenceViolation } from '@/utils/geofenceApi';
import { getGeofenceStatus } from '@/utils/geofenceUtils';
import { getCurrentUser } from '@/lib/authService';

const useGeofenceNotifications = (autoRemoveDelay = 10000) => {
  const [notifications, setNotifications] = useState([]);
  const notificationTimeouts = useRef({});
  const vehicleGeofenceStatusRef = useRef(new Map()); // Lacak status saat ini dari setiap kendaraan
  const lastProcessedPositionsRef = useRef(new Map()); // Cegah pemrosesan duplikat
  const manuallyDismissedRef = useRef(new Set()); // Lacak notifikasi yang ditutup manual
  const activeViolationsRef = useRef(new Map()); // Lacak pelanggaran aktif untuk ditampilkan ulang
  const countdownTimersRef = useRef(new Map()); // Lacak timer countdown untuk ditampilkan ulang
  const addViolationNotificationRef = useRef(null); // Referensi untuk menghindari dependensi melingkar

  // Fungsi untuk menghasilkan kunci pelanggaran unik
  const getViolationKey = useCallback((vehicle, geofence, violationType) => {
    return `${vehicle.vehicle_id}-${geofence.id}-${violationType}`;
  }, []);

  // Fungsi untuk menghapus notifikasi tertentu
  const removeNotification = useCallback((notificationId, isManualDismissal = false) => {
    console.log(`🗑️ Removing notification ${notificationId}, manual: ${isManualDismissal}`);
    
    // Jika ditutup manual, lacak untuk mencegah ditampilkan ulang
    if (isManualDismissal) {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        const violationKey = getViolationKey(
          { vehicle_id: notification.vehicle_id },
          { id: notification.geofence_id || notification.geofence_name },
          notification.event_type
        );
        manuallyDismissedRef.current.add(violationKey);
        console.log(`🚫 Marking violation as manually dismissed: ${violationKey}`);
        
        // Hapus dari pelanggaran aktif dan hentikan countdown
        activeViolationsRef.current.delete(violationKey);
        if (countdownTimersRef.current.has(violationKey)) {
          clearTimeout(countdownTimersRef.current.get(violationKey));
          countdownTimersRef.current.delete(violationKey);
        }
      }
    }

    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

    // Hapus timeout jika ada
    if (notificationTimeouts.current[notificationId]) {
      clearTimeout(notificationTimeouts.current[notificationId]);
      delete notificationTimeouts.current[notificationId];
    }
  }, [notifications, getViolationKey]);

  // Fungsi untuk mengecek apakah notifikasi harus ditampilkan ulang setelah countdown
  const scheduleNotificationReshow = useCallback((violationData, violationKey) => {
    console.log(`⏰ Scheduling re-show for violation: ${violationKey}`);
    
    // Hapus countdown yang ada untuk pelanggaran ini
    if (countdownTimersRef.current.has(violationKey)) {
      clearTimeout(countdownTimersRef.current.get(violationKey));
    }

    // Set timer countdown baru dengan delay lebih lama untuk mengurangi spam notifikasi
    const reshowDelay = 10000; // Delay 10 detik untuk tampilkan ulang (frekuensi berkurang)
    const timer = setTimeout(() => {
      console.log(`⏰ Countdown expired for ${violationKey}, checking if still active...`);
      
      // Cek apakah pelanggaran masih aktif dan tidak ditutup manual
      if (activeViolationsRef.current.has(violationKey) && 
          !manuallyDismissedRef.current.has(violationKey)) {
        console.log(`🔄 Re-showing notification for active violation: ${violationKey}`);
        if (addViolationNotificationRef.current) {
          addViolationNotificationRef.current(violationData, true); // true = tampilkan ulang
        }
      } else {
        console.log(`✅ Not re-showing: ${violationKey} (active: ${activeViolationsRef.current.has(violationKey)}, dismissed: ${manuallyDismissedRef.current.has(violationKey)})`);
      }
      
      countdownTimersRef.current.delete(violationKey);
    }, reshowDelay);

    countdownTimersRef.current.set(violationKey, timer);
  }, []); // Tidak perlu dependensi dengan pendekatan ref

  // Fungsi untuk menambahkan notifikasi pelanggaran dan simpan ke Directus
  const addViolationNotification = useCallback(async (violationData, isReshow = false) => {
    const { vehicle, geofence, violationType, timestamp } = violationData;
    const violationKey = getViolationKey(vehicle, geofence, violationType);
    
    console.log('🚨 Adding violation notification:', {
      vehicleId: vehicle.vehicle_id,
      vehicleName: vehicle.name,
      geofenceName: geofence.name,
      violationType,
      violationKey,
      isReshow,
      isManuallyDismissed: manuallyDismissedRef.current.has(violationKey),
      willSaveToDirectus: !isReshow
    });

    // Jangan tampilkan jika ditutup manual
    if (manuallyDismissedRef.current.has(violationKey)) {
      console.log(`🚫 Skipping notification - manually dismissed: ${violationKey}`);
      return null;
    }

    // Tandai sebagai pelanggaran aktif
    activeViolationsRef.current.set(violationKey, violationData);
    
    // Buat objek notifikasi
    const notification = {
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vehicle_id: vehicle.vehicle_id,
      vehicle_name: vehicle.name || `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Kendaraan',
      geofence_id: geofence.id,
      geofence_name: geofence.name,
      event_type: violationType,
      timestamp: timestamp,
      lokasi: vehicle.position ? `${vehicle.position.lat}, ${vehicle.position.lng}` : null,
      isNew: true,
      violationKey // Tambahkan kunci pelanggaran untuk pelacakan
    };

    // Hasilkan pesan alert untuk Directus
    const alertMessage = violationType === 'violation_enter' 
      ? `PELANGGARAN: Kendaraan ${notification.vehicle_name} memasuki geofence ${geofence.name} (FORBIDDEN)`
      : `PELANGGARAN: Kendaraan ${notification.vehicle_name} keluar dari geofence ${geofence.name} (STAY_IN)`;

    notification.alert_message = alertMessage;

    // Tambahkan notifikasi ke UI segera - ganti notifikasi yang ada
    setNotifications(prev => {
              // Hapus notifikasi yang ada karena kita hanya ingin maksimal 1
      prev.forEach(notif => {
          if (notificationTimeouts.current[notif.id]) {
            clearTimeout(notificationTimeouts.current[notif.id]);
            delete notificationTimeouts.current[notif.id];
          }
        });
      return [notification]; // Hanya simpan notifikasi baru
    });

    // Hapus notifikasi otomatis setelah delay dan jadwalkan tampilkan ulang
    if (autoRemoveDelay > 0) {
      notificationTimeouts.current[notification.id] = setTimeout(() => {
        console.log(`⏰ Auto-removing notification: ${notification.id}`);
        removeNotification(notification.id, false); // false = bukan penutupan manual
        
        // Jadwalkan tampilkan ulang jika pelanggaran masih aktif
        scheduleNotificationReshow(violationData, violationKey);
      }, autoRemoveDelay);
    }

    console.log(`🚨 Violation notification added:`, {
      type: violationType,
      vehicle: notification.vehicle_name,
      geofence: geofence.name,
      location: notification.lokasi,
      violationKey,
      willSaveToDirectus: !isReshow
    });

    // Simpan ke alert Directus di background (hanya untuk pelanggaran baru, bukan tampilan ulang)
    if (!isReshow) {
      console.log(`💾 DIRECTUS SAVE: ${violationType} for ${notification.vehicle_name} (NEW VIOLATION)`);
      try {
        const vehicleData = {
          vehicle_id: vehicle.vehicle_id,
          vehicle_name: notification.vehicle_name,
          name: vehicle.name,
          make: vehicle.make,
          model: vehicle.model,
          license_plate: vehicle.license_plate,
          position: vehicle.position
        };

        const geofenceData = {
          geofence_id: geofence.id,
          geofence_name: geofence.name,
          name: geofence.name,
          rule_type: geofence.type
        };

        const eventType = violationType.replace('violation_', ''); // konversi 'violation_enter' ke 'enter'
        
        // Dapatkan user saat ini untuk validasi API
        const currentUser = getCurrentUser();
        if (!currentUser) {
          console.error('❌ No current user found, cannot save violation to Directus');
          return;
        }
        
        await handleGeofenceViolation({
          eventType: eventType,
          vehicle: vehicleData,
          geofence: geofenceData,
          timestamp: timestamp,
          user_id: currentUser.userId
        });

        console.log(`✅ SYNCHRONIZATION SUCCESS: UI notification AND Directus data saved for vehicle ${vehicle.vehicle_id}`);
      } catch (error) {
        console.error('❌ Error saving violation to Directus:', error);
      }
    } else {
      console.log(`🔄 DIRECTUS SKIP: ${violationType} for ${notification.vehicle_name} (RESHOW - NO DATA SAVE)`);
    }

    return notification.id;
  }, [getViolationKey, autoRemoveDelay, removeNotification, scheduleNotificationReshow]); // DIPERBAIKI: Tambahkan scheduleNotificationReshow ke dependensi

  // Simpan referensi setelah fungsi dibuat untuk menghindari dependensi melingkar
  useEffect(() => {
    addViolationNotificationRef.current = addViolationNotification;
  }, [addViolationNotification]);

  // Fungsi untuk menghapus semua notifikasi
  const removeAllNotifications = useCallback(() => {
    setNotifications([]);
    Object.values(notificationTimeouts.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    notificationTimeouts.current = {};
    
    // Hapus timer countdown
    countdownTimersRef.current.forEach(timer => clearTimeout(timer));
    countdownTimersRef.current.clear();
  }, []);

  // Fungsi untuk menghapus pelanggaran ketika status kendaraan berubah
  const clearViolation = useCallback((vehicle, geofence, violationType) => {
    const violationKey = getViolationKey(vehicle, geofence, violationType);
    console.log(`✅ Clearing violation: ${violationKey}`);
    
    // Hapus dari pelanggaran aktif
    activeViolationsRef.current.delete(violationKey);
    
    // Hapus timer countdown
    if (countdownTimersRef.current.has(violationKey)) {
      clearTimeout(countdownTimersRef.current.get(violationKey));
      countdownTimersRef.current.delete(violationKey);
    }
    
    // Hapus dari yang ditutup manual (izinkan pelanggaran baru)
    manuallyDismissedRef.current.delete(violationKey);
  }, [getViolationKey]);

  // Fungsi utama untuk deteksi pelanggaran geofence real-time
  const checkVehicleGeofenceViolations = useCallback(async (vehicles, geofences) => {
    console.group('🔍 GEOFENCE VIOLATION CHECK');
    console.log('Input data:', {
      vehiclesCount: vehicles?.length || 0,
      geofencesCount: geofences?.length || 0,
      vehicles: vehicles?.map(v => ({
        id: v.vehicle_id,
        name: v.name,
        hasPosition: !!v.position,
        position: v.position ? `${v.position.lat.toFixed(6)}, ${v.position.lng.toFixed(6)}` : 'No position'
      })),
      geofences: geofences?.map(g => ({
        id: g.geofence_id,
        name: g.name,
        ruleType: g.rule_type,
        type: g.type
      }))
    });

    if (!vehicles || !geofences || vehicles.length === 0 || geofences.length === 0) {
      console.log('⚠️ Skipping check: No vehicles or geofences available');
      console.groupEnd();
      return;
    }

    const timestamp = new Date().toISOString();
    
    for (const vehicle of vehicles) {
      // Lewati kendaraan tanpa data posisi
      if (!vehicle.position || !vehicle.vehicle_id) {
        console.log(`⚠️ Skipping vehicle ${vehicle.vehicle_id}: No position data`);
        continue;
      }

      const vehicleId = vehicle.vehicle_id;
      const currentPosition = `${vehicle.position.lat},${vehicle.position.lng}`;
      
      console.log(`\n🚗 Checking vehicle ${vehicleId} (${vehicle.name}):`);
      console.log(`   Position: ${currentPosition}`);
      
      // Cek apakah posisi berubah untuk mencegah pemrosesan duplikat
      const lastProcessedPosition = lastProcessedPositionsRef.current.get(vehicleId);
      console.log(`   Previous processed position: ${lastProcessedPosition}`);
      console.log(`   Position changed: ${lastProcessedPosition !== currentPosition}`);
      
      // Lewati jika posisi tidak berubah - ini mencegah deteksi spam dan penyimpanan spam ke Directus
      if (lastProcessedPosition === currentPosition) {
        console.log(`   ⏭️ Same position as last check, skipping to prevent duplicate violations`);
        continue;
      }
      
      console.log(`   🔄 Position changed - checking for violations...`);
      
      // Perbarui posisi terakhir yang diproses
      lastProcessedPositionsRef.current.set(vehicleId, currentPosition);

      // Get current geofence status for this vehicle
      console.log(`   🔍 Checking against ${geofences.length} geofences...`);
      
      const currentStatus = getGeofenceStatus(vehicle, geofences);
      console.log('   📍 Geofence status result:', currentStatus);
      
      const previousStatus = vehicleGeofenceStatusRef.current.get(vehicleId);
      console.log('   📋 Previous status:', previousStatus);

      // Check for violations
      if (currentStatus && currentStatus.inside) {
        // Vehicle is inside a geofence
        const currentGeofenceId = currentStatus.id;
        const currentGeofenceType = currentStatus.type;

        console.log(`   ✅ Vehicle IS INSIDE geofence:`);
        console.log(`      Geofence: ${currentStatus.name}`);
        console.log(`      Type: ${currentGeofenceType}`);
        console.log(`      ID: ${currentGeofenceId}`);

        // Check if this is a violation (entering FORBIDDEN area)
        const isFirstTimeDetection = previousStatus === undefined;
        const isNewEntry = !previousStatus || !previousStatus.inside || 
                          (previousStatus.inside && previousStatus.geofenceId !== currentGeofenceId);

        console.log(`   🆕 Is new entry: ${isNewEntry}`);
        console.log(`   🔍 Is first time detection: ${isFirstTimeDetection}`);

        if (currentGeofenceType === 'FORBIDDEN' && (isNewEntry || isFirstTimeDetection)) {
          const geofence = geofences.find(g => (g.geofence_id || g.id) === currentGeofenceId);
          console.log(`   🚨 VIOLATION DETECTED: Vehicle entered FORBIDDEN area!`);
          
          if (geofence) {
            // Check if this is a completely new violation (not reshow)
            const violationKey = getViolationKey(
              { vehicle_id: vehicleId }, 
              { id: currentGeofenceId }, 
              'violation_enter'
            );
            const isAlreadyActive = activeViolationsRef.current.has(violationKey);
            
            console.log(`   🔥 TRIGGERING VIOLATION NOTIFICATION...`);
            console.log(`   📝 Violation key: ${violationKey}`);
            console.log(`   🔄 Already active: ${isAlreadyActive}`);
            
            await addViolationNotification({
              vehicle,
              geofence: {
                id: currentGeofenceId,
                name: currentStatus.name,
                type: currentGeofenceType
              },
              violationType: 'violation_enter',
              timestamp
            }, isAlreadyActive); // Pass isReshow flag - true if already active (reshow)
          }
        }

        // Clear STAY_IN exit violations when vehicle re-enters the geofence
        if (currentGeofenceType === 'STAY_IN' && (isNewEntry || isFirstTimeDetection)) {
          console.log(`   ✅ Vehicle re-entered STAY_IN geofence - clearing exit violation`);
          clearViolation(
            { vehicle_id: vehicleId },
            { id: currentGeofenceId },
            'violation_exit'
          );
        }

        // Update status
        vehicleGeofenceStatusRef.current.set(vehicleId, {
          inside: true,
          geofenceId: currentGeofenceId,
          geofenceName: currentStatus.name,
          geofenceType: currentGeofenceType
        });
      } else {
        // Vehicle is outside all geofences
        console.log(`   ❌ Vehicle is OUTSIDE all geofences`);
        
        if (previousStatus && previousStatus.inside) {
          // Vehicle just exited a geofence
          const exitedGeofenceType = previousStatus.geofenceType;

          console.log(`   🚪 Vehicle exited geofence:`);
          console.log(`      Previous geofence: ${previousStatus.geofenceName}`);
          console.log(`      Previous type: ${exitedGeofenceType}`);

          // Check if this is a violation (exiting STAY_IN area)
          if (exitedGeofenceType === 'STAY_IN') {
            const geofence = geofences.find(g => (g.geofence_id || g.id) === previousStatus.geofenceId);
            console.log(`   🚨 VIOLATION DETECTED: Vehicle exited STAY_IN area!`);
            
            if (geofence) {
              // Check if this is a completely new violation (not reshow)
              const violationKey = getViolationKey(
                { vehicle_id: vehicleId }, 
                { id: previousStatus.geofenceId }, 
                'violation_exit'
              );
              const isAlreadyActive = activeViolationsRef.current.has(violationKey);
              
              console.log(`   🔥 TRIGGERING VIOLATION EXIT NOTIFICATION...`);
              console.log(`   📝 Violation key: ${violationKey}`);
              console.log(`   🔄 Already active: ${isAlreadyActive}`);
              
              await addViolationNotification({
                vehicle,
                geofence: {
                  id: previousStatus.geofenceId,
                  name: previousStatus.geofenceName,
                  type: exitedGeofenceType
                },
                violationType: 'violation_exit',
                timestamp
              }, isAlreadyActive); // Pass isReshow flag - true if already active (reshow)
            }
          }

          // Only clear FORBIDDEN violations when exiting (keep STAY_IN violations active for re-shows)
          if (exitedGeofenceType === 'FORBIDDEN') {
            console.log(`   🧹 Clearing FORBIDDEN violation - vehicle exited forbidden area`);
            clearViolation(
              { vehicle_id: vehicleId },
              { id: previousStatus.geofenceId },
              'violation_enter'
            );
          }
          // NOTE: STAY_IN exit violations are NOT cleared here - they remain active for re-shows
          // They will only be cleared when:
          // 1. Vehicle re-enters the STAY_IN geofence (handled above)
          // 2. User manually dismisses the notification (handled in removeNotification)
          console.log(`   ℹ️ STAY_IN exit violation kept active for re-shows (if any)`);
        }

        // Update status to outside
        vehicleGeofenceStatusRef.current.set(vehicleId, {
          inside: false,
          geofenceId: null,
          geofenceName: null,
          geofenceType: null
        });
      }
    }
    
    console.groupEnd();
  }, [addViolationNotification, clearViolation, getViolationKey]); // FIXED: Added getViolationKey to dependencies

  // Backward compatibility functions (now just wrappers or no-ops)
  const addNotification = useCallback((eventData) => {
    // Legacy function - only process if it's a violation
    if (eventData.event_type === 'violation_enter' || eventData.event_type === 'violation_exit') {
      console.log(`🔄 Legacy notification processed: ${eventData.event_type}`);
      
      // Check if this is already an active violation (for legacy calls)
      const violationKey = getViolationKey(
        { vehicle_id: eventData.vehicle_id },
        { id: eventData.geofence_id },
        eventData.event_type
      );
      const isAlreadyActive = activeViolationsRef.current.has(violationKey);
      
      console.log(`📝 Legacy violation key: ${violationKey}`);
      console.log(`🔄 Legacy already active: ${isAlreadyActive}`);
      
      return addViolationNotification({
        vehicle: {
          vehicle_id: eventData.vehicle_id,
          name: eventData.vehicle_name,
          position: eventData.position
        },
        geofence: {
          id: eventData.geofence_id,
          name: eventData.geofence_name,
          type: eventData.event_type === 'violation_enter' ? 'FORBIDDEN' : 'STAY_IN'
        },
        violationType: eventData.event_type,
        timestamp: eventData.timestamp || new Date().toISOString()
      }, isAlreadyActive); // Pass isReshow flag - true if already active (reshow)
    }
  }, [addViolationNotification, getViolationKey]);

  const processGeofenceEvents = useCallback(() => {
    // No longer needed - real-time detection replaces this
    console.log('🔕 processGeofenceEvents is deprecated - using real-time detection');
  }, []);

  const processGeofenceEventsWithSave = useCallback(() => {
    // No longer needed - real-time detection replaces this
    console.log('🔕 processGeofenceEventsWithSave is deprecated - using real-time detection');
  }, []);

  const fetchLatestAlerts = useCallback(() => {
    // No longer needed - real-time detection replaces polling
    console.log('🔕 fetchLatestAlerts is deprecated - using real-time detection');
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    removeAllNotifications,
    checkVehicleGeofenceViolations, // Main function for real-time detection
    clearViolation, // NEW: Function to clear violations
    // Legacy functions for backward compatibility
    processGeofenceEvents,
    processGeofenceEventsWithSave,
    fetchLatestAlerts
  };
};

export default useGeofenceNotifications;