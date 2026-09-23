import { useNavigate } from 'react-router-dom'

// Returns to whatever screen the user came from (Kassa, Müştərilər, Rezervasiyalar, ...)
// instead of always dropping them on the orders list. React Router's browser history is
// already a LIFO stack — `navigate(-1)` pops it — so this just uses that instead of a
// hardcoded path, and only falls back when there's nothing in this tab's SPA history to
// pop to (e.g. the detail page was opened directly via a refresh or external link).
export function useGoBack(fallbackPath: string) {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
    } else {
      navigate(fallbackPath)
    }
  }
}
