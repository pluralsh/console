import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { WorkbenchLaunchRouteState } from 'routes/workbenchesRoutesConsts'

export function useTransientWorkbenchPrompt() {
  const navigate = useNavigate()
  const location = useLocation()
  const navPrompt = (location.state as Nullable<WorkbenchLaunchRouteState>)
    ?.prompt
  const prevNavPromptRef = useRef(navPrompt)
  const [prompt, setPrompt] = useState(navPrompt ?? '')
  const [promptSyncKey, setPromptSyncKey] = useState(navPrompt ? 1 : 0)

  useEffect(() => {
    if (!navPrompt) {
      prevNavPromptRef.current = undefined
      return
    }

    if (navPrompt !== prevNavPromptRef.current) {
      prevNavPromptRef.current = navPrompt
      setPrompt(navPrompt)
      setPromptSyncKey((key) => key + 1)
    }

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      { replace: true, state: null }
    )
  }, [location.hash, location.pathname, location.search, navPrompt, navigate])

  return { prompt, promptSyncKey, setPrompt, setPromptSyncKey }
}
