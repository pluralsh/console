import isNil from 'lodash/isNil'

const COOKIE_PREF_STORAGE_KEY = 'plural-cookie-preferences'
const COOKIE_LISTENER_NAME = 'cookiePrefsChanged'

type CookiePrefs = { statistics: boolean; marketing: boolean }

const DEFAULT_PREFS = {
  statistics: false,
  marketing: false,
} as const satisfies CookiePrefs

const setCookiePrefs = (prefs: Partial<CookiePrefs> & { all?: boolean }) => {
  const nextPrefs = mergePrefs(getCookiePrefs(), prefs)

  localStorage.setItem(COOKIE_PREF_STORAGE_KEY, JSON.stringify(nextPrefs))
}

const getCookiePrefs = () => {
  const storedPrefs = localStorage.getItem(COOKIE_PREF_STORAGE_KEY)
  let parsedPrefs: Record<string, unknown>

  try {
    parsedPrefs = storedPrefs ? JSON.parse(storedPrefs) : {}
  }
  catch (e) {
    parsedPrefs = {}
  }

  return mergePrefs(DEFAULT_PREFS, parsedPrefs)
}

const mergePrefs = (prev: CookiePrefs, next: Record<string, unknown>) => {
  const nextPrefs = { ...next }

  // check if 'all' prop is set, and if so, set all individual prefs to its value
  if (!isNil(nextPrefs.all)) {
    for (const [key] of Object.entries(DEFAULT_PREFS)) {
      nextPrefs[key] = !!nextPrefs.all
    }
  }
  const newPrefs = { ...prev }

  for (const [key] of Object.entries(newPrefs)) {
    if (key in nextPrefs) {
      newPrefs[key] = nextPrefs[key]
    }
  }

  return newPrefs
}

const addPrefChangeListener = (listener: EventListenerOrEventListenerObject) => {
  window.addEventListener(COOKIE_LISTENER_NAME, listener)
}

const removePrefChangeListener = listener => {
  window.removeEventListener(COOKIE_LISTENER_NAME, listener)
}

export {
  setCookiePrefs,
  getCookiePrefs,
  addPrefChangeListener,
  removePrefChangeListener,
}
