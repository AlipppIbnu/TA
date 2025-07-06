// components/BasemapSelector.js - Aligned with sidebar toggle button
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

const BasemapSelector = ({ onStyleChange, currentStyle = 'streets', sidebarWidth = 0, isSidebarVisible = true, activePanel = null }) => {
  const [showStyleBox, setShowStyleBox] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const mapStyles = [
    {
      id: 'streets',
      name: 'Streets',
      thumbnail: '/images/street.jpg',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    {
      id: 'satellite',
      name: 'Satellite',
      thumbnail: '/images/satellite.jpg',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    },
    {
      id: 'outdoor',
      name: 'Outdoor',
      thumbnail: '/images/outdoor.jpg',
      url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'
    },
    {
      id: 'dark',
      name: 'Dark',
      thumbnail: '/images/dark.jpg',
      url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
    }
  ];

  const handleStyleSelect = (styleId) => {
    onStyleChange(styleId);
    setShowStyleBox(false);
  };

  const toggleStyleBox = () => {
    setShowStyleBox(!showStyleBox);
  };

  // Calculate position based on sidebar state (same logic as sidebar toggle)
  const getButtonPosition = () => {
    if (isSidebarVisible) {
      return sidebarWidth + 16 + 56 + 8; // sidebar width + margin + toggle button width + gap
    } else {
      if (activePanel) {
        return 272 + 56 + 8; // collapsed position + toggle button width + gap
      } else {
        return 24 + 56 + 8; // minimal position + toggle button width + gap
      }
    }
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStyleBox && !event.target.closest('.basemap-selector-container')) {
        setShowStyleBox(false);
      }
    };

    if (mounted) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStyleBox, mounted]);

  if (!mounted) return null;

  const buttonLeft = getButtonPosition();
  const panelLeft = buttonLeft - 20; // Slight offset for better positioning

  return (
    <>
      {/* Basemap Toggle Button - Aligned with sidebar toggle */}
      <button
        onClick={toggleStyleBox}
        className="fixed top-6 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-2.5 shadow-lg hover:shadow-xl hover:bg-white transition-all duration-200 z-50 basemap-selector-container"
        style={{
          left: `${buttonLeft}px`
        }}
        title="Change basemap"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </button>

      {/* Style Selection Box */}
      {showStyleBox && createPortal(
        <div className="basemap-selector-container fixed bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 p-4 z-50"
          style={{
            top: '70px',
            left: `${panelLeft}px`,
            width: '180px'
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Basemap</h4>
            <button 
              onClick={toggleStyleBox}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2">
            {mapStyles.map((style) => (
              <div
                key={style.id}
                onClick={() => handleStyleSelect(style.id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentStyle === style.id 
                    ? 'bg-blue-50 border border-blue-300' 
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className={`relative w-12 h-12 rounded overflow-hidden ${
                  currentStyle === style.id ? 'ring-2 ring-blue-500' : ''
                }`}>
                  {/* Placeholder untuk thumbnail - ganti dengan Image jika ada gambar */}
                  <div className={`w-full h-full flex items-center justify-center text-xs font-medium ${
                    style.id === 'streets' ? 'bg-gray-200 text-gray-700' :
                    style.id === 'satellite' ? 'bg-blue-900 text-white' :
                    style.id === 'outdoor' ? 'bg-green-200 text-green-800' :
                    'bg-gray-800 text-gray-300'
                  }`}>
                    {style.name.slice(0, 3).toUpperCase()}
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  currentStyle === style.id ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {style.name}
                </span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        .basemap-selector-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </>
  );
};

export default BasemapSelector;