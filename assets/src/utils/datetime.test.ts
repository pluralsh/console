import { expect, vi } from 'vitest'
import {
  formatDateTime,
  isSameDay,
  isBefore,
  isAfter,
  fromNow,
  toDateOrUndef,
  formatLocalizedDateTime,
} from './datetime'

describe('datetime utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatDateTime', () => {
    it('should return empty string for null/undefined dates', () => {
      expect(formatDateTime(null)).toBe('')
      expect(formatDateTime(undefined)).toBe('')
    })

    it('should format with custom pattern when provided', () => {
      expect(formatDateTime('2024-01-15', 'YYYY-MM-DD')).toBe('2024-01-15')
    })

    it('should format to time only if same day', () => {
      expect(formatDateTime('2024-01-15T10:30:00Z')).toBe('10:30 am')
    })

    it('should format to date and time if different day', () => {
      expect(formatDateTime('2024-01-14T10:30:00Z')).toBe(
        'Jan 14, 2024 10:30 am'
      )
    })
  })

  describe('isSameDay', () => {
    it('should return false for null/undefined dates', () => {
      expect(isSameDay(null)).toBe(false)
      expect(isSameDay(undefined)).toBe(false)
    })

    it('should correctly compare dates', () => {
      expect(isSameDay('2024-01-15')).toBe(true)
      expect(isSameDay('2024-01-14')).toBe(false)
    })
  })

  describe('isBefore/isAfter', () => {
    it('should return false for null/undefined dates', () => {
      expect(isBefore(null)).toBe(false)
      expect(isBefore(undefined)).toBe(false)
      expect(isAfter(null)).toBe(false)
      expect(isAfter(undefined)).toBe(false)
    })

    it('should correctly compare dates', () => {
      expect(isBefore('2024-01-14')).toBe(true)
      expect(isBefore('2024-01-16')).toBe(false)
      expect(isBefore('2024-01-14', '2024-01-16')).toBe(true)
      expect(isBefore('2024-01-16', '2024-01-14')).toBe(false)

      expect(isAfter('2024-01-16')).toBe(true)
      expect(isAfter('2024-01-14')).toBe(false)
      expect(isAfter('2024-01-16', '2024-01-14')).toBe(true)
      expect(isAfter('2024-01-14', '2024-01-16')).toBe(false)
    })
  })

  describe('fromNow', () => {
    it('should return empty string for null/undefined dates', () => {
      expect(fromNow(null)).toBe('')
      expect(fromNow(undefined)).toBe('')
    })

    it('should return relative time', () => {
      expect(fromNow('2024-01-15T11:30:00Z')).toBe('30 minutes ago')
      expect(fromNow('2024-01-14T12:00:00Z')).toBe('a day ago')
    })
  })

  describe('toDateOrUndef', () => {
    it('should return undefined for invalid dates', () => {
      expect(toDateOrUndef('invalid')).toBeUndefined()
      expect(toDateOrUndef(null)).toBeUndefined()
    })

    it('should return Date object for valid dates', () => {
      const date = toDateOrUndef('2024-01-15')
      expect(date).toBeInstanceOf(Date)
      expect(date?.toISOString()).toMatch(/^2024-01-15/)
    })
  })

  describe('formatLocalizedDateTime', () => {
    it('should return empty string for null/undefined dates', () => {
      expect(formatLocalizedDateTime(null)).toBe('')
      expect(formatLocalizedDateTime(undefined)).toBe('')
    })

    it('should format date in localized format', () => {
      expect(formatLocalizedDateTime('2024-01-15T12:00:00Z')).toMatch(
        /Jan 15, 2024/
      )
    })
  })
})
