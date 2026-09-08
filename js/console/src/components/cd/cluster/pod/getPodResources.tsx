import { cpuParser, memoryParser } from 'utils/kubernetes'
import { Container, Maybe } from 'generated/graphql'

function isValidNum(n?: unknown): n is number {
  return typeof n === 'number' && !Number.isNaN(n)
}

type Reservations = {
  limits?: number
  requests?: number
  remainder?: number
}

export function getPodResources(
  containers: Maybe<Maybe<Container>[]> | undefined
) {
  const cpuSum: Reservations = {
    requests: undefined,
    limits: undefined,
    remainder: undefined,
  }
  const memorySum: Reservations = {
    requests: undefined,
    limits: undefined,
    remainder: undefined,
  }

  if (!containers || containers.length === 0) {
    return {
      cpu: cpuSum,
      memory: memorySum,
    }
  }
  for (const container of containers) {
    const requests = {
      cpu: cpuParser(container?.resources?.requests?.cpu),
      memory: memoryParser(container?.resources?.requests?.memory),
    }
    const limits = {
      cpu: cpuParser(container?.resources?.limits?.cpu),
      memory: memoryParser(container?.resources?.limits?.memory),
    }

    if (isValidNum(limits?.cpu)) {
      cpuSum.limits = (cpuSum.limits || 0) + limits.cpu
    }
    if (isValidNum(requests?.cpu)) {
      cpuSum.requests = (cpuSum.requests || 0) + requests.cpu
    }
    if (isValidNum(limits?.memory)) {
      memorySum.limits = (memorySum.limits || 0) + limits.memory
    }
    if (isValidNum(requests?.memory)) {
      memorySum.requests = (memorySum.requests || 0) + requests.memory
    }
    if (isValidNum(requests?.memory) && isValidNum(limits.memory)) {
      memorySum.remainder =
        (memorySum.remainder || 0) + (limits.memory - requests.memory)
    }
    if (isValidNum(requests?.cpu) && isValidNum(limits.cpu)) {
      cpuSum.remainder = (cpuSum.remainder || 0) + (limits.cpu - requests.cpu)
    }
  }

  return {
    cpu: cpuSum,
    memory: memorySum,
  }
}
