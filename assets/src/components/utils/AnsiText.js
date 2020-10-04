import React, { useMemo } from 'react'
import Anser from 'anser'
import { escapeCarriageReturn } from 'escape-carriage'

function textStyle({bg, fg}) {
  return {backgroundColor: bg && `rgb(${bg})`, color: fg && `rgb(${fg})`}
}

export function AnsiText({text}) {
  const blocks = useMemo(() => Anser.ansiToJson(escapeCarriageReturn(text), {json: true, remove_empty: true}), [text])

  return (
    <code>
      {blocks.filter(({content}) => content.replace(/\s/g, '').length).map((json, i) => (
        <pre key={i} style={textStyle(json)}>
          {json.content}
        </pre>
      ))}
    </code>
  )
}