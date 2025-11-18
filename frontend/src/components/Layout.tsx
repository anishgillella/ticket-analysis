import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../contexts/ThemeContext';

const Layout = () => {
  const { theme } = useTheme();
  
  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;