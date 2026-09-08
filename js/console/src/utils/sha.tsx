export function isSha1(str: Nullable<string>) {
  return str?.length === 40 && !str.match(/[^0-9a-f]/)
}

export function shortenSha1(ref) {
  return isSha1(ref) ? `${ref.slice(0, 5)}…${ref.slice(ref.length - 5)}` : ref
}

export async function hash(
  str: string,
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<string> {
  const utf8 = new TextEncoder().encode(str)
  const hashBuffer = await crypto.subtle.digest(algorithm, utf8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  return hashArray.map((bytes) => bytes.toString(16).padStart(2, '0')).join('')
}
