import { wipeToken } from './auth.ts'

export function clearLocalStorage(): void {
  wipeToken()
}
