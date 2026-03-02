import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ExchangeProvider } from './context/ExchangeContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationOverlay from './components/Shared/NotificationOverlay';
import { useExchange } from './hooks/useExchange';
import { usePresence } from './hooks/usePresence';
import Header from './components/Display/Header';
import RateTable from './components/Display/RateTable';
import Clock from './components/Display/Clock';
import InfoCarousel from './components/Display/InfoCarousel';
import BottomBar from './components/Display/BottomBar';
import Dashboard from './components/Admin/Dashboard';
import Login from './components/Admin/Login';
import Register from './components/Admin/Register';
import UserPanel from './components/User/UserPanel';
import './index.css';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const DisplayScreen: React.FC = () => {
  const context = useExchange();
  const { settings, rates, currentUser } = context;

  // Real-time presence tracking
  usePresence(currentUser);

  const getUserSettings = () => {
    if (!currentUser?.name || currentUser.role === 'Admin') {
      return { shopName: settings.shopName, scrollingText: settings.scrollingText };
    }
    const key = `userPanelSettings_${currentUser.name}`;
    const saved = localStorage.getItem(key);
    let savedScrollingText = settings.scrollingText;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.scrollingText) savedScrollingText = parsed.scrollingText;
      } catch { /* fall through */ }
    }
    return {
      shopName: currentUser.shopName || `${currentUser.name.toUpperCase()} SARRAFİYE`,
      scrollingText: savedScrollingText
    };
  };

  const userSettings = getUserSettings();

  // TV Mode (Fullscreen)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Hide cursor after 3s of inactivity in fullscreen
  useEffect(() => {
    if (!isFullscreen) { setShowCursor(true); return; }
    const handleMouseMove = () => {
      setShowCursor(true);
      if (cursorTimeout.current) clearTimeout(cursorTimeout.current);
      cursorTimeout.current = setTimeout(() => setShowCursor(false), 3000);
    };
    handleMouseMove();
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (cursorTimeout.current) clearTimeout(cursorTimeout.current);
    };
  }, [isFullscreen]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0d1225 0%, #0a0e1a 50%, #0d1225 100%)',
        position: 'relative',
        overflow: 'hidden',
        cursor: isFullscreen && !showCursor ? 'none' : 'default',
      }}
    >
      {/* Top border */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #8B6914, #D4A731, #F5D56E, #D4A731, #8B6914)',
        zIndex: 10
      }} />

      {/* Bottom border */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #8B6914, #D4A731, #F5D56E, #D4A731, #8B6914)',
        zIndex: 10
      }} />

      <Header shopName={userSettings.shopName} />

      <div className="main-content" style={{
        flex: 1,
        display: 'flex',
        gap: 0,
        minHeight: 0,
        padding: '8px'
      }}>
        {/* Left: Rate Table */}
        <RateTable rates={rates.filter(r => r.isVisible !== false)} />

        {/* Info Panel Overlay for mobile */}
        <div
          className={`info-panel-overlay ${isInfoPanelOpen ? 'open' : ''}`}
          onClick={() => setIsInfoPanelOpen(false)}
        />

        {/* Right: Info Panel */}
        <div className={`info-panel-wrapper ${isInfoPanelOpen ? 'open' : ''}`} style={{
          width: '320px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          height: '100%' // Fill height to distribute
        }}>
          {/* Mobile close button inside panel */}
          <div className="mobile-close-btn-wrapper" style={{ display: 'none', justifyContent: 'flex-end', marginBottom: '-4px' }}>
            <button
              onClick={() => setIsInfoPanelOpen(false)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ✕ Kapat
            </button>
          </div>
          {/* 1. Text Info Panel */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(20, 28, 50, 0.8), rgba(15, 20, 40, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(212, 167, 49, 0.12)',
            padding: '20px',
            textAlign: 'center',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100px'
          }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '18px',
              fontWeight: 700,
              color: '#F5D56E',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap' // Allow newlines
            }}>
              {userSettings.scrollingText || 'Soma Sarraf ve Kuyumcular Derneği'}
            </div>
          </div>

          {/* 2. Chart Component */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <InfoCarousel />
          </div>

          {/* 3. Clock */}
          <div style={{ flexShrink: 0 }}>
            <Clock />
          </div>
        </div>
      </div>

      <BottomBar
        hasValue={context.liveRates.has}
        hasChange={context.liveRates.hasChange}
        onsValue={context.liveRates.ons}
        onsChange={context.liveRates.onsChange}
      />

      {/* Footer with TV Mode Button */}
      <div style={{
        flexShrink: 0,
        padding: '6px 16px',
        background: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid rgba(212, 167, 49, 0.1)',
        zIndex: 5,
        position: 'relative',
      }}>
        <button
          className="mobile-info-btn"
          onClick={() => setIsInfoPanelOpen(true)}
          style={{
            position: 'absolute',
            left: '16px',
            display: 'none', // Set via CSS on mobile
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: 'linear-gradient(135deg, rgba(212, 167, 49, 0.15), rgba(212, 167, 49, 0.05))',
            border: '1px solid rgba(212, 167, 49, 0.3)',
            borderRadius: '8px',
            color: '#D4A731',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          📊 Grafikler
        </button>

        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'rgba(212, 167, 49, 0.5)',
          letterSpacing: '3px',
          textTransform: 'uppercase'
        }} className="footer-info-text">
          FİYATLAR BİLGİ AMAÇLIDIR
        </span>

        <button
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: isFullscreen ? '5px 14px' : '5px 16px',
            background: isFullscreen
              ? 'rgba(239, 68, 68, 0.15)'
              : 'linear-gradient(135deg, rgba(212, 167, 49, 0.15), rgba(212, 167, 49, 0.05))',
            border: isFullscreen
              ? '1px solid rgba(239, 68, 68, 0.3)'
              : '1px solid rgba(212, 167, 49, 0.3)',
            borderRadius: '8px',
            color: isFullscreen ? '#F87171' : '#D4A731',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            letterSpacing: '1px',
          }}
          className="desktop-tv-btn"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = isFullscreen
              ? '0 0 12px rgba(239, 68, 68, 0.2)'
              : '0 0 12px rgba(212, 167, 49, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isFullscreen ? '✕ Çık' : '📺 TV Modu'}
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <ExchangeProvider>
      <NotificationProvider>
        <Router>
          <NotificationOverlay />
          <Routes>
            <Route path="/" element={<DisplayScreen />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/panel" element={
              <ProtectedRoute>
                <UserPanel />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </NotificationProvider>
    </ExchangeProvider>
  );
}

export default App;
