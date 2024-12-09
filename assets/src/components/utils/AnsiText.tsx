export function textStyle({ bg, fg, decoration }): any {
  return {
    backgroundColor: bg && `rgb(${bg})`,
    fontWeight: decoration === 'bold' ? 'bold' : null,
    color: fg && `rgb(${fg})`,
  }
}
