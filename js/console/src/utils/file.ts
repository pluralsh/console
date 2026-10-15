export function download(url, name) {
  const tempLink = document.createElement('a')

  tempLink.style.display = 'none'
  tempLink.href = url
  tempLink.setAttribute('download', name || 'true')

  // Safari thinks _blank anchor are pop ups. We only want to set _blank
  // target if the browser does not support the HTML5 download attribute.
  // This allows you to download files in desktop safari if pop up blocking
  // is enabled.
  if (typeof tempLink.download === 'undefined') {
    tempLink.setAttribute('target', '_blank')
  }

  document.body.appendChild(tempLink)
  tempLink.click()

  // Fixes "webkit blob resource error 1"
  setTimeout(() => {
    document.body.removeChild(tempLink)
  }, 0)
}

export function downloadAsFile(content, name, type = 'text') {
  const data = new Blob([content], { type })
  const url = window.URL.createObjectURL(data)

  download(url, name)
}

export function getExtensionFromFileName(fileName: string): string | undefined {
  return fileName.split('.').pop()?.toLowerCase()
}

export function getFileTypeIconKey(fileName: string): string | undefined {
  const lower = fileName.toLowerCase()

  if (
    lower === 'dockerfile' ||
    lower.startsWith('docker-compose.') ||
    lower === 'compose.yml' ||
    lower === 'compose.yaml'
  ) {
    return 'dockerfile'
  }

  return getExtensionFromFileName(fileName)
}

export function getLanguageFromFileName(fileName: string): string | undefined {
  const extension = getExtensionFromFileName(fileName)

  const languageMap: Record<string, string> = {
    yaml: 'yaml',
    yml: 'yaml',
    go: 'go',
    md: 'markdown',
    tpl: 'yaml',
    json: 'json',
    toml: 'toml',
    txt: 'text',
    dockerfile: 'dockerfile',
    py: 'python',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
    tf: 'hcl',
    hcl: 'hcl',
    xml: 'xml',
    html: 'html',
    css: 'css',
    rs: 'rust',
    java: 'java',
    ex: 'elixir',
    exs: 'elixir',
  }

  return extension ? languageMap[extension] : undefined
}

export type FileViewerKind =
  | 'markdown'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'binary'

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'ico',
  'avif',
])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac'])
const BINARY_EXTENSIONS = new Set([
  'zip',
  'gz',
  'tgz',
  'tar',
  'bz2',
  'xz',
  '7z',
  'jar',
  'exe',
  'bin',
  'so',
  'dylib',
  'wasm',
  'parquet',
  'xlsx',
  'docx',
  'pptx',
  // svgs can carry scripts, so they're downloaded rather than rendered inline
  'svg',
])

export function getFileViewerKind(fileName: string): FileViewerKind {
  const extension = getExtensionFromFileName(fileName) ?? ''
  if (extension === 'md' || extension === 'markdown') return 'markdown'
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (VIDEO_EXTENSIONS.has(extension)) return 'video'
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio'
  if (extension === 'pdf') return 'pdf'
  if (BINARY_EXTENSIONS.has(extension)) return 'binary'
  return 'text'
}

export function isImageFile(file: { name: string; type?: string }): boolean {
  if (file.type)
    return file.type.startsWith('image/') && file.type !== 'image/svg+xml'
  return getFileViewerKind(file.name) === 'image'
}

export function formatFileSize(bytes: Nullable<number>): string {
  if (bytes == null) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`
}
