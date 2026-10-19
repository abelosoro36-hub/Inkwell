import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, api, getToken, setToken } from './api'
import type { ApiUser, RegisterBody } from './api'
import { AuthContext } from './authContext'
import type { AuthValue } from './authContext'

// Keeps track of who is signed in. A saved token brings the person back after a refresh.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null)

  useEffect(() => {
    if (getToken() === null) return
    api
      .me()
      .then((r) => setUser(r.user))
      .catch((e: unknown) => {
        // only forget the token when the server says it is no longer valid
        if (e instanceof ApiError && e.status === 401) setToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login(email, password)
    setToken(r.token)
    setUser(r.user)
    return r.user
  }, [])

  const register = useCallback(async (body: RegisterBody) => {
    const r = await api.register(body)
    setToken(r.token)
    setUser(r.user)
    return r.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const r = await api.me()
      setUser(r.user)
    } catch {
      // ignore: the next request will show the real problem
    }
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}