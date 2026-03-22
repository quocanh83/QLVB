import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './pages/UserManagement';
import DocumentManagement from './pages/DocumentManagement';
import SystemSettings from './pages/SystemSettings';
import FeedbackIntake from './pages/FeedbackIntake';
import DraftExplanation from './pages/DraftExplanation';
import DraftDetails from './components/DraftDetails';
import MainLayout from './layouts/MainLayout';
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
          
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<div style={{padding: 24}}><h1>Dashboard Tổng quan (Coming soon)</h1></div>} />
            <Route path="/documents" element={<DocumentManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="/feedback-intake" element={<FeedbackIntake />} />
            <Route path="/draft-explanation" element={<DraftExplanation />} />
            <Route path="/" element={<DraftDetails />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/documents" />} />
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
