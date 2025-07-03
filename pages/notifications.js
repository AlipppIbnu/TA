import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, isAuthenticated } from '@/lib/authService';
import UserDropdown from '@/components/UserDropdown';

const NotificationsPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const alertsPerPage = 15;

  // Delete all notifications state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success/Error modal state
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState('success'); // 'success' or 'error'
  const [resultMessage, setResultMessage] = useState('');

  // Statistics
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [areaViolations, setAreaViolations] = useState(0);
  const [exitViolations, setExitViolations] = useState(0);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user for filtering
      const user = getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      // Fetch alerts with user_id filter for security
      const response = await fetch(`/api/alerts?limit=10000&sort=-timestamp&user_id=${user.userId}`);
      const data = await response.json();

      if (data.success || data.data) {
        const alertsData = data.data || [];
        setAlerts(alertsData);
        setFilteredAlerts(alertsData);
        
        // Calculate statistics
        setTotalNotifications(alertsData.length);
        setAreaViolations(alertsData.filter(alert => alert.alert_type === 'violation_enter').length);
        setExitViolations(alertsData.filter(alert => alert.alert_type === 'violation_exit').length);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetchAlerts();
  }, [router, fetchAlerts]);

  const applyFilter = (filterType) => {
    setActiveFilter(filterType);
    setCurrentPage(1);

    let filtered = alerts;
    if (filterType === 'area_terlarang') {
      filtered = alerts.filter(alert => alert.alert_type === 'violation_enter');
    } else if (filterType === 'keluar_area_wajib') {
      filtered = alerts.filter(alert => alert.alert_type === 'violation_exit');
    }

    setFilteredAlerts(filtered);
  };

  const handleDeleteAllNotifications = async () => {
    try {
      setIsDeleting(true);
      
      // Get current user for security
      const user = getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const response = await fetch('/api/alerts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.userId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Reset all data
        setAlerts([]);
        setFilteredAlerts([]);
        setTotalNotifications(0);
        setAreaViolations(0);
        setExitViolations(0);
        setCurrentPage(1);
        setActiveFilter('all');
        
        // Show success modal
        setResultModalType('success');
        setResultMessage(`Berhasil menghapus ${data.deleted_count} notifikasi`);
        setShowResultModal(true);
      } else {
        // Show error modal
        setResultModalType('error');
        setResultMessage('Gagal menghapus notifikasi: ' + data.message);
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      // Show error modal
      setResultModalType('error');
      setResultMessage('Terjadi kesalahan saat menghapus notifikasi');
      setShowResultModal(true);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Pagination
  const indexOfLastAlert = currentPage * alertsPerPage;
  const indexOfFirstAlert = indexOfLastAlert - alertsPerPage;
  const currentAlerts = filteredAlerts.slice(indexOfFirstAlert, indexOfLastAlert);
  const totalPages = Math.ceil(filteredAlerts.length / alertsPerPage);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getViolationTypeDisplay = (alertType) => {
    switch (alertType) {
      case 'violation_enter':
        return 'MASUK AREA TERLARANG';
      case 'violation_exit':
        return 'KELUAR AREA WAJIB';
      default:
        return 'PELANGGARAN';
    }
  };

  const getViolationIcon = (alertType) => {
    switch (alertType) {
      case 'violation_enter':
        return '🚫';
      case 'violation_exit':
        return '⛔';
      default:
        return '⚠️';
    }
  };

  const getFilterDisplayText = (filterType) => {
    switch (filterType) {
      case 'all':
        return 'Semua Notifikasi';
      case 'area_terlarang':
        return 'Area Terlarang';
      case 'keluar_area_wajib':
        return 'Keluar Area Wajib';
      default:
        return 'Semua Notifikasi';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {/* Back Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="mr-3 p-1.5 rounded-md text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-colors border-0 bg-transparent"
              style={{ 
                outline: 'none !important', 
                boxShadow: 'none !important', 
                border: 'none !important',
                color: 'rgb(75, 85, 99) !important'
              }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Page Title */}
            <h1 className="text-lg font-semibold text-gray-900">Notifikasi</h1>
          </div>
          
          {/* User Dropdown */}
          <UserDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-4">
        {/* Statistics Cards - Clickable Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Notifications */}
          <div 
            onClick={() => applyFilter('all')}
            className={`rounded-lg p-4 shadow-sm border-2 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 ${
              activeFilter === 'all' 
                ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' 
                : 'bg-white border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{totalNotifications}</h3>
                <p className="text-xs text-gray-600 mt-1">Total Pelanggaran</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeFilter === 'all' ? 'bg-blue-200' : 'bg-blue-100'
              }`}>
                <span className="text-lg">📊</span>
              </div>
            </div>
          </div>

          {/* Area Violations */}
          <div 
            onClick={() => applyFilter('area_terlarang')}
            className={`rounded-lg p-4 shadow-sm border-2 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 ${
              activeFilter === 'area_terlarang' 
                ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200' 
                : 'bg-white border-gray-200 hover:border-orange-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-orange-600">{areaViolations}</h3>
                <p className="text-xs text-gray-600 mt-1">Area Terlarang</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeFilter === 'area_terlarang' ? 'bg-orange-200' : 'bg-orange-100'
              }`}>
                <span className="text-lg">🚫</span>
              </div>
            </div>
          </div>

          {/* Exit Violations */}
          <div 
            onClick={() => applyFilter('keluar_area_wajib')}
            className={`rounded-lg p-4 shadow-sm border-2 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 ${
              activeFilter === 'keluar_area_wajib' 
                ? 'bg-red-50 border-red-500 ring-2 ring-red-200' 
                : 'bg-white border-gray-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-red-600">{exitViolations}</h3>
                <p className="text-xs text-gray-600 mt-1">Keluar Area Wajib</p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                activeFilter === 'keluar_area_wajib' ? 'bg-red-200' : 'bg-red-100'
              }`}>
                <span className="text-lg">⛔</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-10 gap-4 items-start">
              {/* Text Section - 30% width (3 columns) */}
              <div className="col-span-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getFilterDisplayText(activeFilter)}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date().toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              {/* Delete All Button Section - 70% width (7 columns) */}
              <div className="col-span-7 flex justify-end">
                {alerts.length > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="flex items-center justify-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        Hapus Semua
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable notifications area */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="divide-y divide-gray-200">
            {currentAlerts.length > 0 ? (
              currentAlerts.map((alert) => (
                <div key={alert.alert_id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        alert.alert_type === 'violation_enter' 
                          ? 'bg-orange-100' 
                          : 'bg-red-100'
                      }`}>
                        <span className="text-lg">{getViolationIcon(alert.alert_type)}</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-bold text-gray-900">
                            {getViolationTypeDisplay(alert.alert_type)}
                          </h4>
                          <span className="text-sm text-gray-500">#{alert.alert_id}</span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-1">
                          {alert.alert_message}
                        </p>
                        
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <span>🕐 {formatDate(alert.timestamp)}, {formatTime(alert.timestamp)}</span>
                          {alert.lokasi && (
                            <span>📍 Koordinat: {alert.lokasi}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">📭</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Tidak ada notifikasi
                </h3>
                <p className="text-base text-gray-600">
                  {activeFilter === 'all' 
                    ? 'Belum ada notifikasi pelanggaran yang tercatat.'
                    : 'Tidak ada notifikasi untuk filter yang dipilih.'
                  }
                </p>
              </div>
            )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </p>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-2 py-1 rounded text-sm ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Sebelumnya
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-2 py-1 rounded text-sm ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-500 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-bold mb-3 text-gray-800">Hapus Semua Notifikasi?</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Apakah Anda yakin ingin menghapus semua notifikasi?
                </p>
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="font-semibold text-sm text-gray-800">Total: {alerts.length} notifikasi</p>
                  <p className="text-xs text-gray-600">Area Terlarang: {areaViolations}</p>
                  <p className="text-xs text-gray-600">Keluar Area Wajib: {exitViolations}</p>
                </div>
                <p className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button 
                  onClick={handleDeleteAllNotifications}
                  disabled={isDeleting}
                  className="px-4 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus Semua'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className={`mx-auto h-12 w-12 flex items-center justify-center mb-3 ${
                resultModalType === 'success' ? 'text-green-500' : 'text-red-500'
              }`}>
                {resultModalType === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                )}
              </div>
              
              <h3 className={`text-lg font-bold mb-3 ${
                resultModalType === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {resultModalType === 'success' ? 'Berhasil!' : 'Gagal!'}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {resultMessage}
                </p>
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={() => setShowResultModal(false)}
                  className={`px-4 py-1.5 text-white rounded-md transition-colors duration-200 text-sm font-medium ${
                    resultModalType === 'success' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage; 