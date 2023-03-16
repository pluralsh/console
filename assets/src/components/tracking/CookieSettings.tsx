import { Banner, Button, Layer } from '@pluralsh/design-system'
import { Flex } from 'honorable'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  addPrefChangeListener,
  getPrefs,
  removePrefChangeListener,
  setConsent,
} from 'utils/cookiePrefs'

type CookieSettingsContextT = {
  show: () => void
  hide: () => void
  setConsent: typeof setConsent
  addListener: typeof addPrefChangeListener
  removeListener: typeof removePrefChangeListener
} & ReturnType<typeof getPrefs>

const CookieSettingsContext = createContext<CookieSettingsContextT | null>(null)

export function CookieSettingsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(getPrefs())
  const [showPrefs, setShowPrefs] = useState(!prefs.hasResponse)

  useEffect(() => {
    const listener = e => {
      console.log('listener event', e)
      console.log('listener event.detail', e.detail)

      setPrefs(e.detail)
    }

    addPrefChangeListener(listener)

    return () => removePrefChangeListener(listener)
  }, [])

  const value: CookieSettingsContextT = useMemo(() => ({
    show: () => setShowPrefs(true),
    hide: () => setShowPrefs(false),
    setConsent,
    addListener: addPrefChangeListener,
    removeListener: removePrefChangeListener,
    ...prefs,
  }),
  [prefs])

  return (
    <CookieSettingsContext.Provider value={value}>
      <CookieSettingsDialog
        show={showPrefs}
        onClose={() => setShowPrefs(false)}
      />
      {children}
    </CookieSettingsContext.Provider>
  )
}

export function useCookieSettings() {
  const context = useContext(CookieSettingsContext)

  if (!context) {
    throw new Error('useCookieSettings() must be used inside of a CookieSettingsProvider')
  }

  return context
}

export function CookieSettingsDialog({
  onClose,
  show,
}: {
  show: boolean
  onClose: () => void
}) {
  const onAllow = useCallback(() => {
    setConsent({ statistics: true })
    onClose()
  }, [onClose])

  const onDeny = useCallback(() => {
    setConsent({ statistics: false })
    onClose()
  }, [onClose])

  return (
    <Layer
      open={show}
      position="bottom-right"
      margin={{
        right: 50,
        bottom: 50,
      }}
    >
      <Banner
        heading="We use cookies"
        severity="info"
        onClose={() => onClose?.()}
        maxWidth="calc(min(100vw - 100px, 480px))"
      >
        <Flex
          gap="small"
          direction="column"
        >
          We use cookies to improve your experience and make product updates and
          refinements.
          <Flex gap="small">
            <Button
              primary
              onClick={onAllow}
            >
              Allow
            </Button>
            <Button
              secondary
              onClick={onDeny}
            >
              Deny
            </Button>
          </Flex>
        </Flex>
      </Banner>
    </Layer>
  )
}
