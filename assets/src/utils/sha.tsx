export function isSha1(str: Nullable<string>) {
  return str?.length === 40 && !str.match(/[^0-9a-f]/)
}

export function shortenSha1(ref) {
  return isSha1(ref) ? `${ref.slice(0, 5)}…${ref.slice(ref.length - 5)}` : ref
}
