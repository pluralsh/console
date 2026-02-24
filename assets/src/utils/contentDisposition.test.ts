import { expect } from 'vitest'
import { parseContentDispositionFilename } from './contentDisposition'

describe('contentDisposition utils', () => {
  describe('parseContentDispositionFilename', () => {
    it('should parse quoted filename parameter', () => {
      expect(
        parseContentDispositionFilename('attachment; filename="report.zip"')
      ).toBe('report.zip')
    })

    it('should parse and decode utf-8 filename* parameter', () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename*=UTF-8''%E2%82%AC%20rates.txt"
        )
      ).toBe('€ rates.txt')
    })

    it('should prefer filename* over filename when both exist', () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="fallback.txt"; filename*=UTF-8\'\'preferred.txt'
        )
      ).toBe('preferred.txt')
    })

    it('should return undefined for invalid header values', () => {
      expect(parseContentDispositionFilename('not-a-header')).toBeUndefined()
      expect(
        parseContentDispositionFilename('attachment; filename')
      ).toBeUndefined()
      expect(parseContentDispositionFilename('')).toBeUndefined()
    })
  })
})
