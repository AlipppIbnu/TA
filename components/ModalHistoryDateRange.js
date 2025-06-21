import { createPortal } from 'react-dom';
import { useState } from 'react';

const ModalHistoryDateRange = ({ onClose, onSelectDateRange }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setError('Silakan pilih tanggal mulai dan tanggal akhir');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set end date to end of day

    if (end < start) {
      setError('Tanggal akhir tidak boleh lebih awal dari tanggal mulai');
      return;
    }

    // Set start date to start of day
    start.setHours(0, 0, 0, 0);

    onSelectDateRange(start.toISOString(), end.toISOString());
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white p-6 rounded-md shadow-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4 text-center">Pilih Rentang Waktu History</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
          >
            Lihat History
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalHistoryDateRange; 