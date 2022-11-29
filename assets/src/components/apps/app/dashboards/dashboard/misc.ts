import { filesize } from 'filesize'

export function format(value: any, format: any) {
  switch (format) {
  case 'bytes':
    return filesize(value || 0)
  case 'percent':
    return `${Math.round(value * 10000) / 100}%`
  default:
    return value
  }
}
