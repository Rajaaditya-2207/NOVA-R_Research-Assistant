import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon, LogOut, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const { user, authenticated, loading, login, logout } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <img 
                src="/nova-avatar.png" 
                alt="NOVA-R" 
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm';
                  fallback.textContent = 'N';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
              <span className="font-semibold text-lg">NOVA‑R</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-6">
              <a href="#features" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Features</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Pricing</a>
              <a href="#about" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">About</a>
            </nav>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2 hidden md:block" />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            
            {!loading && (
              authenticated && user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 bg-sky-400 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                      {user.name}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={login}
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                  >
                    Sign In
                  </button>
                  <Link
                    to="/chat"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Launch App
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
