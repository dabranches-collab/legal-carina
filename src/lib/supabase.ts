import { createClient } from '@supabase/supabase-js'
import { resilientReadFetch } from './resilientReadFetch'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
// The integrated browser cannot call the Supabase origin directly from a localhost preview.
// Keep the preview on the same origin; production continues to use the configured URL.
const localPreview = typeof window !== 'undefined'
  && ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  && configuredUrl?.startsWith('https://vtvvqyebigflgqccbqsw.supabase.co')
const url = localPreview ? `${window.location.origin}/supabase-api` : configuredUrl
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const hasSupabaseConfiguration = Boolean(url && publishableKey)

export const supabase = hasSupabaseConfiguration
  ? createClient(url, publishableKey, {
      global: { fetch: resilientReadFetch },
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'legal-carina-auth',
        experimental: { passkey: true },
      },
    })
  : null
