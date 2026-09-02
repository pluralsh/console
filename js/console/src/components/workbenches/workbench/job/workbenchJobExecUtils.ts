export type ExecChunkMap = Record<number, string>

export function combineExecChunks(chunks: ExecChunkMap): string {
  return Object.entries(chunks)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, text]) => text)
    .join('')
}
