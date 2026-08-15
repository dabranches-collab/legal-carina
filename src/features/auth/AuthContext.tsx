import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export interface AuthContextValue {
  user: User | null
  signOut: () => Promise<void>
  updatePassword: (password: string) => Promise<boolean>
  enrollPasskey: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue>({ user: null, signOut: async () => undefined, updatePassword: async () => false, enrollPasskey: async () => 'Passkey indisponível.' })
export const useAuth = () => useContext(AuthContext)
