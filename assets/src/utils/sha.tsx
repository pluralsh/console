export function isSha1(str: Nullable<string>) {
  return str?.length === 40 && !str.match(/[^0-9a-f]/)
}
