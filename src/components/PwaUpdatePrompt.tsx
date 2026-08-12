import { useRegisterSW } from 'virtual:pwa-register/react'
import './PwaUpdatePrompt.css'

/**
 * Prompts when a new service worker / app update is available.
 */
export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Periodically check for updates while the app stays open.
      setInterval(
        () => {
          void registration.update()
        },
        60 * 60 * 1000,
      )
    },
  })

  const visible = offlineReady || needRefresh
  if (!visible) return null

  function close() {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div className="pwa-toast" role="alert" aria-live="polite">
      <div className="pwa-toast-message">
        {needRefresh ? (
          <span>A new version of Unki is available.</span>
        ) : (
          <span>Unki is ready to work offline.</span>
        )}
      </div>
      <div className="pwa-toast-actions">
        {needRefresh ? (
          <button
            type="button"
            className="pwa-toast-primary"
            onClick={() => void updateServiceWorker(true)}
          >
            Reload
          </button>
        ) : null}
        <button type="button" className="pwa-toast-secondary" onClick={close}>
          Close
        </button>
      </div>
    </div>
  )
}
