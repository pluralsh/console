export function textAreaInsert(
  tArea: HTMLTextAreaElement | null | undefined,
  text: string
) {
  if (tArea && text) {
    tArea.focus()
    let curVal = tArea.value

    if (typeof document.execCommand === 'function') {
      document.execCommand('insertText', false, text)
    } else {
      const startPos = tArea.selectionStart
      const endPos = tArea.selectionEnd

      curVal = `${tArea.value.substring(0, startPos)}${text}${curVal.substring(
        endPos,
        curVal.length
      )}`

      tArea.value = curVal
      tArea.selectionStart = startPos + 1
      tArea.selectionEnd = tArea.selectionStart

      tArea.dispatchEvent(new Event('change', { bubbles: true }))
    }
    tArea.blur()
    tArea.focus()
  }
}
