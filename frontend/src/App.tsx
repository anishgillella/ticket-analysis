import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TicketAnalysis from './pages/TicketAnalysis';
import Layout from './components/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="analysis" element={<TicketAnalysis />} />
        </Route>
      </Routes>
    </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
