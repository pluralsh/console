import { cpuParser, memoryParser } from 'utils/kubernetes'
import { Container, Maybe } from 'generated/graphql'

export function getPodResources(containers: Maybe<Maybe<Container>[]> | undefined,
  type: string) {
  let memory: number | undefined
  let cpu: number | undefined

  if (!containers || containers.length === 0) {
    return {
      cpu: undefined,
      memory: undefined,
    }
  }
  for (const { resources } of containers) {
    const resourceSpec = resources[type]

    if (!resourceSpec) {
      continue
    }
    if (resourceSpec.cpu) {
      cpu = (cpu || 0) + (cpuParser(resourceSpec.cpu) ?? 0)
    }
    if (resourceSpec.memory) {
      memory = (memory || 0) + (memoryParser(resourceSpec.memory) ?? 0)
    }
  }

  return {
    cpu: cpu === undefined ? cpu : Math.ceil(100 * cpu) / 100,
    memory,
  }
}
