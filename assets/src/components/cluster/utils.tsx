export function roundToTwoPlaces(x: number) {
  return roundTo(x, 2)
}

export const roundTo = (x: number, decimalPlaces = 2) => {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw Error('decimalPlaces must be positive integer')
  }
  const factor = 10 ** Math.floor(decimalPlaces)

  return Math.round(x * factor) / factor
}

export const datum = ({ timestamp, value }) => ({
  x: new Date(timestamp * 1000),
  y: roundToTwoPlaces(parseFloat(value)),
})

export const cpuFmt = (cpu) => `${cpu}vcpu`

export const getAllContainersFromPods = (pods) =>
  pods
    .filter(({ status: { phase } }) => phase !== 'Succeeded')
    .map(({ spec: { containers } }) => containers)
    .flat()
