import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export interface AuthContextValue {
  user: User | null
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({ user: null, signOut: async () => undefined })
export const useAuth = () => useContext(AuthContext)
