const MULTIPLES = {
  m: 1000,
  n: 1000 ** 3
}

export function cpuParser(input) {
  const milliMatch = input.match(/^([0-9]+)([a-z])$/);
  if (milliMatch) {
    console.log(milliMatch)
    return parseFloat(milliMatch[1]) / MULTIPLES[milliMatch[2]];
  }

  return parseFloat(input);
}