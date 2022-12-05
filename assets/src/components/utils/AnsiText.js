import React, { useMemo } from 'react'
import Anser from 'anser'
import { escapeCarriageReturn } from 'escape-carriage'
import { Box } from 'grommet'

function textStyle({
  bg, fg, decoration, ...rest
}) {
  console.log(rest)

  return {
    backgroundColor: bg && `rgb(${bg})`,
    fontWeight: decoration === 'bold' ? 'bold' : null,
    color: fg && `rgb(${fg})`,
  }
}

export function AnsiLine({ line }) {
  const blocks = useMemo(() => Anser.ansiToJson(escapeCarriageReturn(line), { json: true, remove_empty: true }), [line])

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

export const AnsiText = React.memo(({ text }) => {
  if (!text) return null

  return text.split(/\r?\n/).map((line, ind) => (
    <Box
      key={`${ind}`}
      flex={false}
      height="20px"
      direction="row"
    >
      <AnsiLine line={line} />
    </Box>
  ))
})
