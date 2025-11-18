import React from 'react';
import { MenuIcon, BellIcon, SearchIcon, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-b transition-colors`}>
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <button className={`md:hidden p-2 rounded-md ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
          <MenuIcon size={24} />
        </button>
        <div className="hidden md:block">
          <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>
            Support Ticket Analyst
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`relative mr-2 ${theme === 'dark' ? 'w-56' : 'w-64'}`}>
            <input
              type="text"
              placeholder="Search tickets..."
              className={`w-full py-2 pl-10 pr-4 text-sm rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-100 placeholder-slate-400'
                  : 'bg-gray-100 text-gray-700 placeholder-gray-500'
              }`}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SearchIcon size={18} className={theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} />
            </div>
          </div>
          <button className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
            <BellIcon size={20} />
          </button>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="ml-2 relative">
            <div className={`h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center`}>
              <span className="text-sm font-medium">JD</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
