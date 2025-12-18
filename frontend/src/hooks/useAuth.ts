import { useState, useEffect } from 'react'

interface User {
  email: string
  name: string
  picture?: string
  sub: string
  auth_type?: string
}

interface AuthState {
  user: User | null
  authenticated: boolean
  loading: boolean
}

interface AuthStatus {
  auth_required: boolean
  google_oauth_enabled: boolean
  authenticated: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    authenticated: false,
    loading: true
  })
  const [authConfig, setAuthConfig] = useState<AuthStatus | null>(null)

  const checkAuth = async () => {
    try {
      const [userRes, statusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/user`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/auth/status`, { credentials: 'include' })
      ])
      
      if (userRes.ok && statusRes.ok) {
        const userData = await userRes.json()
        const statusData = await statusRes.json()
        
        setAuthState({
          user: userData.user,
          authenticated: userData.authenticated,
          loading: false
        })
        setAuthConfig(statusData)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthState({ user: null, authenticated: false, loading: false })
    }
  }

  const login = () => {
    window.location.href = `${API_BASE_URL}/auth/login/google`
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { 
        credentials: 'include',
        method: 'POST'
      })
      setAuthState({ user: null, authenticated: false, loading: false })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return {
    ...authState,
    authConfig,
    login,
    logout,
    refresh: checkAuth
  }
}
