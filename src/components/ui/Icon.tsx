import type { SVGProps } from 'react'

export type IconName = 'overview' | 'clock' | 'clients' | 'matters' | 'building' | 'people' | 'invoice' | 'payment' | 'rules' | 'import' | 'reports' | 'audit' | 'admin' | 'search' | 'calendar' | 'bell' | 'logout' | 'menu' | 'chevron' | 'filter' | 'download' | 'columns' | 'more' | 'trend' | 'warning' | 'check' | 'close'

const paths: Record<IconName, React.ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  clients: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5c3 0 5 2 5 5M17 13c3 .5 4 3 4 7"/></>,
  matters: <><path d="M4 7h6l2 2h8v10H4z"/><path d="M4 7V5h6l2 2"/></>,
  building: <><path d="M4 21V5l8-3 8 3v16M8 8h1M8 12h1M8 16h1M15 8h1M15 12h1M15 16h1M10 21v-3h4v3"/></>,
  people: <><circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 21c0-4 2-7 6-7s6 3 6 7M14 14c4 0 7 2 7 6"/></>,
  invoice: <><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  payment: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>,
  rules: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="18" r="2"/></>,
  import: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
  reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  audit: <><path d="M9 3h6l1 3h4v15H4V6h4zM8 11h8M8 15h5"/></>,
  admin: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5l2 1.5-2 3.5-2.5-1a8 8 0 0 1-3 1.7L13 22H9l-.5-2.8a8 8 0 0 1-3-1.7l-2.5 1L1 15l2-1.5a8 8 0 0 1 0-3L1 9l2-3.5 2.5 1a8 8 0 0 1 3-1.7L9 2h4l.5 2.8a8 8 0 0 1 3 1.7l2.5-1L21 9l-2 1.5a8 8 0 0 1 0 3z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>, logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>, chevron: <path d="m9 18 6-6-6-6"/>, filter: <path d="M3 5h18l-7 8v6l-4 2v-8z"/>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>, columns: <><rect x="3" y="4" width="18" height="16"/><path d="M9 4v16M15 4v16"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>, trend: <path d="m3 17 6-6 4 4 8-9M15 6h6v6"/>,
  warning: <><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></>, check: <path d="m4 12 5 5L20 6"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
