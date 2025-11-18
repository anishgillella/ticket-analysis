import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboardIcon, BarChart2Icon, SettingsIcon, HelpCircleIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = () => {
  const { theme } = useTheme();
  
  const navItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <LayoutDashboardIcon size={20} />
    },
    {
      path: '/analysis',
      label: 'Analysis',
      icon: <BarChart2Icon size={20} />
    }
  ];

  return (
    <div className={`hidden md:flex flex-col w-64 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-r transition-colors`}>
      <div className={`flex items-center justify-center h-16 ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'} border-b`}>
        <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Support Ticket Analyst
        </h1>
      </div>
      <nav className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
        <div className="px-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-indigo-900/30 text-indigo-400'
                      : 'bg-indigo-50 text-indigo-700'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className={`p-4 ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'} border-t`}>
        <button className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          theme === 'dark'
            ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}>
          <SettingsIcon size={20} className="mr-3" />
          Settings
        </button>
        <button className={`flex items-center w-full px-4 py-2 mt-1 text-sm font-medium rounded-md transition-colors ${
          theme === 'dark'
            ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}>
          <HelpCircleIcon size={20} className="mr-3" />
          Help & Support
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
