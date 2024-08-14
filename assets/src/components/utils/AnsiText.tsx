import React, { useMemo } from 'react'
import Anser from 'anser'
import { escapeCarriageReturn } from 'escape-carriage'

export function textStyle({ bg, fg, decoration }): any {
  return {
    backgroundColor: bg && `rgb(${bg})`,
    fontWeight: decoration === 'bold' ? 'bold' : null,
    color: fg && `rgb(${fg})`,
  }
}

export function AnsiLine({ line }) {
  const blocks = useMemo(
    () =>
      Anser.ansiToJson(escapeCarriageReturn(line), {
        json: true,
        remove_empty: true,
      }),
    [line]
  )

  return (
    <>
      {blocks.map((json, i) => (
        <pre
          key={i}
          style={textStyle(json)}
        >
          {json.content}
        </pre>
      ))}
    </>
  )
}

export const AnsiText = React.memo(({ text }: any) => {
  if (!text) return null

  return text.split(/\r?\n/).map((line, ind) => (
    <div
      key={`${ind}`}
      css={{
        height: '20px',
        width: 'fit-content',
      }}
    >
      <AnsiLine line={line} />
    </div>
  ))
})
