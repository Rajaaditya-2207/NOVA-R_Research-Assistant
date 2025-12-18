import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun, ArrowLeft, Loader2 } from 'lucide-react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const buildUrl = (path: string) => `${API_BASE_URL}${path}`

const Login: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [trialName, setTrialName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch(buildUrl('/auth/status'))
        const data = await response.json()
        if (data.authenticated) {
          navigate('/chat')
        }
      } catch (err) {
        console.error('Auth check failed:', err)
      }
    }
    void checkAuth()
  }, [navigate])

  const handleGoogleLogin = () => {
    setLoading(true)
    
    // Open OAuth in a popup window
    const width = 500
    const height = 600
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    
    const popup = window.open(
      buildUrl('/auth/login/google?redirect=' + encodeURIComponent(window.location.origin + '/chat')),
      'GoogleOAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    )
    
    // Poll for authentication completion
    const checkAuth = setInterval(async () => {
      try {
        // Check if popup is closed
        if (popup && popup.closed) {
          clearInterval(checkAuth)
          
          // Check authentication status
          const response = await fetch(buildUrl('/auth/status'), {
            credentials: 'include'
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.authenticated) {
              // Success! Redirect to chat using React Router
              navigate('/chat')
            } else {
              setLoading(false)
              setError('Authentication failed. Please try again.')
            }
          } else {
            setLoading(false)
            setError('Failed to verify authentication.')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
      }
    }, 500) // Check every 500ms
    
    // Cleanup timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkAuth)
      if (popup && !popup.closed) {
        popup.close()
      }
      setLoading(false)
    }, 5 * 60 * 1000)
  }

  const handleTrialStart = async () => {
    if (!trialName.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(buildUrl('/auth/trial/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: trialName })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start trial')
      }

      // Redirect to chat
      navigate('/chat')
    } catch (err) {
      console.error('Trial start error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start trial')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && trialName.trim() && !loading) {
      void handleTrialStart()
    }
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen transition-colors">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft size={20} />
              <span>Back</span>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              NOVA-R
            </h1>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo/Title */}
            <div className="text-center mb-8">
              <img 
                src="/nova-avatar.png" 
                alt="NOVA-R" 
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
              <h2 className="text-3xl font-bold mb-2">Welcome to NOVA-R</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your AI-powered research assistant
              </p>
            </div>

            {/* Login Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">OR</span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
              </div>

              {/* Trial Mode */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Try for free (No sign up required)</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={trialName}
                    onChange={(e) => setTrialName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleTrialStart}
                  disabled={!trialName.trim() || loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin mx-auto" />
                  ) : (
                    'Start Free Trial'
                  )}
                </button>
              </div>

              {/* Info */}
              <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
                Trial mode expires when you close your browser. Sign in with Google for persistent sessions.
              </p>
            </div>

            {/* Terms */}
            <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
              By continuing, you agree to our{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Login
