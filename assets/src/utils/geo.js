export function formatLocation(country, city) {
  if (!country) return ''
  if (!city) return country
  return `${city} / ${country}`
}