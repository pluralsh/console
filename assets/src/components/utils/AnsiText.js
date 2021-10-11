import React, { useMemo } from 'react'
import Anser from 'anser'
import { escapeCarriageReturn } from 'escape-carriage'

function textStyle({bg, fg, decoration, ...rest}) {
  console.log(rest)
  return {
    backgroundColor: bg && `rgb(${bg})`, 
    fontWeight: decoration === 'bold' ? 'bold' : null, 
    color: fg && `rgb(${fg})`
  }
}

export function AnsiText({text}) {
  const blocks = useMemo(() => Anser.ansiToJson(escapeCarriageReturn(text), {json: true, remove_empty: true}), [text])

  return blocks.map((json, i) => (
    <pre key={i} style={textStyle(json)}>
      {json.content}
    </pre>
  ))
}