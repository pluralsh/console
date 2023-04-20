import { type DefaultTheme } from 'styled-components'

export type UserType = {
  name?: string
  email?: string
  imageUrl?: string
}

export type Severity = 'info' | 'warning' | 'success' | 'error' | 'danger'

export type ColorKey = keyof DefaultTheme['colors']
