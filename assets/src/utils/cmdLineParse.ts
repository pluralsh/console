export function splitCommand(command) {
  const result: { cmd: string; args: string[] } = {
    cmd: '',
    args: [],
  }

  let tokenStarted = false
  let inSingleQuote = false
  let inDoubleQuote = false
  let escapeNext = false
  let keepDelims = false
  let currentToken = ''
  const tokens: string[] = []

  for (let i = 0; i < command.length; i++) {
    const char = command[i]

    if (escapeNext) {
      currentToken += char
      escapeNext = false
    } else if (char === '\\') {
      escapeNext = true
    } else if (char === '"' && !inSingleQuote) {
      if (tokenStarted && !inDoubleQuote) {
        keepDelims = true
      }

      if (keepDelims) {
        currentToken += char
      }

      tokenStarted = true
      inDoubleQuote = !inDoubleQuote
    } else if (char === "'" && !inDoubleQuote) {
      if (tokenStarted && !inSingleQuote) {
        keepDelims = true
      }

      if (keepDelims) {
        currentToken += char
      }

      tokenStarted = true
      inSingleQuote = !inSingleQuote
    } else if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (tokenStarted) {
        tokens.push(currentToken)
        currentToken = ''
        tokenStarted = false
        keepDelims = false
      }
    } else {
      tokenStarted = true
      currentToken += char
    }
  }

  if (tokenStarted) tokens.push(currentToken)

  if (tokens.length > 0) [result.cmd, ...result.args] = tokens

  return result
}
