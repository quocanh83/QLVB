import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import VibeFeedbackIntake from './pages/VibeFeedbackIntake';
import VibeLayout from './layouts/VibeLayout';
import VibeDashboard from './pages/VibeDashboard';
import VibeHome from './pages/VibeHome';
import VibeDocuments from './pages/VibeDocuments';
import VibeUsers from './pages/VibeUsers';
import VibeReports from './pages/VibeReports';
import VibeSettings from './pages/VibeSettings';
import { ConfigProvider, theme } from 'antd';
import { ThemeProvider, useAppTheme } from './context/ThemeContext';

// Import CSS themes
import './styles/theme-light.css';
import './styles/theme-dark.css';
import './App.css';

const AppContent = () => {
  const { isDarkMode } = useAppTheme();

  return (
    <ConfigProvider 
      theme={{ 
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#00d4ff',
          colorSuccess: '#2fd87c',
          borderRadius: 4,
        }
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Unified Vibe 2.0 Routes */}
          <Route element={<ProtectedRoute><VibeLayout /></ProtectedRoute>}>
            <Route path="/" element={<VibeHome />} />
            <Route path="/dashboard" element={<VibeHome />} />
            <Route path="/vibe-dashboard" element={<VibeDashboard />} />
            <Route path="/reports" element={<VibeReports />} />
            <Route path="/documents" element={<VibeDocuments />} />
            <Route path="/users" element={<VibeUsers />} />
            <Route path="/settings" element={<VibeSettings />} />
            <Route path="/feedback-intake" element={<VibeFeedbackIntake />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
