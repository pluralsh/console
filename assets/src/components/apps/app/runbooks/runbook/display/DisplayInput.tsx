import { Input } from '@pluralsh/design-system'
import { Div, Span } from 'honorable'
import { useContext, useEffect, useState } from 'react'

import { DisplayContext } from '../RunbookDisplay'

import { convertType, valueFrom } from './misc'

export default function DisplayInput({ attributes, children }) {
  const { context, setContext, ...rest } = useContext(DisplayContext)
  const [value, setValue] = useState(children?.length > 0 ? valueFrom(children[0], rest) : '')

  useEffect(() => {
    const { name } = attributes
    const val = value === '' ? null : value
    const converted = convertType(val, attributes.datatype)

    if (context[name] !== converted && converted) {
      setContext({ ...context, [name]: converted })
    }
  }, [attributes, context, setContext, value])

  return (
    <Div margin="xsmall">
      <Span
        caption
        marginBottom="xxsmall"
        whiteSpace="nowrap"
      >
        { attributes.label }
      </Span>
      <Input
        value={value || ''}
        onChange={(({ target: { value } }) => setValue(value))}
        width={attributes.width || 150}
        {...attributes}
      />
    </Div>
  )
}
