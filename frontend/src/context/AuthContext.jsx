import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import i18n from 'i18next'
import client from '../api/client'
import { LANGUAGE_OPTIONS } from '../i18n/config'

const AuthContext = createContext(null)

function syncLanguageFromProfile(user) {
  const uiLanguage = user?.profile?.ui_language
  if (uiLanguage && LANGUAGE_OPTIONS.some((l) => l.code === uiLanguage) && uiLanguage !== i18n.resolvedLanguage) {
    i18n.changeLanguage(uiLanguage)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await client.get('/auth/me/')
      setUser(data)
      syncLanguageFromProfile(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [fetchMe])

  // Step 1 of login: validate credentials, triggers an emailed code. No
  // tokens are issued yet — see verifyLoginCode for step 2.
  const login = async (email, password) => {
    const { data } = await client.post('/auth/login/', { email, password })
    return data
  }

  const verifyLoginCode = async (loginRef, code) => {
    const { data } = await client.post('/auth/login/verify/', { login_ref: loginRef, code })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUser(data.user)
    syncLanguageFromProfile(data.user)
    return data
  }

  const resendLoginCode = async (loginRef) => {
    const { data } = await client.post('/auth/login/resend-code/', { login_ref: loginRef })
    return data
  }

  // Registration no longer logs the user in — the account must be verified
  // by email first.
  const register = async (payload) => {
    const { data } = await client.post('/auth/register/', payload)
    return data
  }

  const verifyEmail = async (email, code) => {
    const { data } = await client.post('/auth/verify-email/', { email, code })
    return data
  }

  const resendVerification = async (email) => {
    const { data } = await client.post('/auth/resend-verification/', { email })
    return data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user, loading, login, verifyLoginCode, resendLoginCode,
        register, verifyEmail, resendVerification, logout, refreshUser: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
