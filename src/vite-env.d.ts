/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare module 'virtual:release-notes' {
  import type { ReleaseNotes } from './components/feedback/releaseNotes'
  const notes: ReleaseNotes
  export default notes
}
