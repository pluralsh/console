import isNil from 'lodash/isNil'

const COOKIE_PREF_STORAGE_KEY = 'plural-cookie-preferences'
const COOKIE_LISTENER_NAME = 'cookiePrefsChanged'

const CONSENT_KEYS = ['statistics', 'marketing'] as const

export type ConsentType = (typeof CONSENT_KEYS)[number]
export type Consent = Record<ConsentType, boolean>
export type SetConsent = Partial<Consent> & { all?: boolean }
export type CookiePrefs = {
  consent: Consent
  hasResponse: boolean
}

const DEFAULT_PREFS = {
  consent: {
    statistics: false,
    marketing: false,
  },
  hasResponse: false,
} as const satisfies CookiePrefs

const setConsent = (consent: SetConsent) => {
  const originalPrefs = getPrefs()
  const nextPrefs = { ...originalPrefs, hasResponse: true }

  nextPrefs.consent = mergeConsent(originalPrefs.consent, consent)

  localStorage.setItem(COOKIE_PREF_STORAGE_KEY, JSON.stringify(nextPrefs))
  window.dispatchEvent(
    new CustomEvent<CookiePrefs>(COOKIE_LISTENER_NAME, { detail: getPrefs() })
  )
}

const getPrefs = () => {
  const storedPrefs = localStorage.getItem(COOKIE_PREF_STORAGE_KEY)
  let parsedPrefs: Record<string, unknown>

  try {
    parsedPrefs = storedPrefs ? JSON.parse(storedPrefs) : {}
  } catch (e) {
    parsedPrefs = {}
  }

  return {
    ...DEFAULT_PREFS,
    ...parsedPrefs,
    consent: mergeConsent(DEFAULT_PREFS.consent, parsedPrefs.consent),
  }
}

const mergeConsent = (prev: Partial<Consent>, next: unknown) => {
  const nextConsent: Record<string, unknown> = {
    ...(typeof next === 'object' && !isNil(next) ? next : {}),
  }

  // check if 'all' prop is set, and if so, set all individual consents to its value
  if (!isNil(nextConsent.all)) {
    for (const key of CONSENT_KEYS) {
      nextConsent[key] = !!nextConsent.all
    }
  }
  const newConsent: Consent = { ...DEFAULT_PREFS.consent }

  for (const key of CONSENT_KEYS) {
    const nextVal = nextConsent[key]

    newConsent[key] =
      typeof nextVal === 'boolean'
        ? nextVal
        : prev[key] ?? DEFAULT_PREFS.consent[key]
  }

  return newConsent
}

function addPrefChangeListener(
  listener: (e: CustomEvent<CookiePrefs>) => void
) {
  window.addEventListener(COOKIE_LISTENER_NAME, listener as EventListener)
}

function removePrefChangeListener(
  listener: (e: CustomEvent<CookiePrefs>) => void
) {
  window.removeEventListener(COOKIE_LISTENER_NAME, listener as EventListener)
}

export { setConsent, getPrefs, addPrefChangeListener, removePrefChangeListener }
