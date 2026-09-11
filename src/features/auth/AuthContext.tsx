import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ApplicationRole } from '../../types/database.types'

export interface AuthContextValue {
  user: User | null
  role: ApplicationRole | null
  signOut: () => Promise<void>
  updatePassword: (password: string) => Promise<boolean>
  enrollPasskey: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue>({ user: null, role: null, signOut: async () => undefined, updatePassword: async () => false, enrollPasskey: async () => 'Passkey indisponível.' })
export const useAuth = () => useContext(AuthContext)
