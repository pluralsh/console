import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { CD_DEFAULT_ABS_PATH } from 'routes/cdRoutesConsts'
import { useLogin } from 'components/contexts'

export const useCDEnabled = (props?: { redirect?: boolean }) => {
  const login = useLogin()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const redirect = !!props?.redirect
  const cdEnabled = !!login?.configuration?.features?.cd

  useEffect(() => {
    if (!redirect || cdEnabled || pathname === CD_DEFAULT_ABS_PATH) {
      return
    }
    navigate(CD_DEFAULT_ABS_PATH)
  }, [cdEnabled, navigate, redirect, pathname])

  return cdEnabled
}
