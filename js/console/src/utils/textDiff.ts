// Parses Elixir TextDiff format output to extract old content.
// TextDiff format: "LEFT_NUM  RIGHT_NUM  MARKER |content"
// where MARKER is ' ' (context), '-' (deletion), or '+' (addition).
// Old content = context lines + deletion lines.
export const getOldContentFromTextDiff = (
  newContent: string,
  textDiff: Nullable<string>
): string => {
  if (!textDiff) return newContent

  try {
    const lines = stripAnsi(textDiff).split('\n')
    const oldLines: string[] = []

    for (const line of lines) {
      const pipeIndex = line.indexOf('|')
      if (pipeIndex === -1) continue

      const meta = line.substring(0, pipeIndex)
      const content = line.substring(pipeIndex + 1)

      if (meta.includes('+')) continue
      oldLines.push(content)
    }

    return oldLines.join('\n')
  } catch {
    return newContent
  }
}

const stripAnsi = (str: string): string => str.replace(/\x1b\[[0-9;]*m/g, '')
