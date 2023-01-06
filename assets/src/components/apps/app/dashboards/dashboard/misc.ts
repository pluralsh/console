import { filesize } from 'filesize'

export function format(value: number | null | undefined, format: string) {
  switch (format) {
  case 'bytes':
    return filesize(value ?? 0)
  case 'percent':
    return `${Math.round((value ?? 0) * 10000) / 100}%`
  default:
    return value
  }
}
