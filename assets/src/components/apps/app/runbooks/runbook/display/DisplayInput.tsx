import { Input } from '@pluralsh/design-system'
import { useContext, useEffect, useState } from 'react'

import { useTheme } from 'styled-components'

import { DisplayContext } from '../RunbookDisplay'

import { convertType, valueFrom } from './misc'

export default function DisplayInput({ attributes, children }) {
  const theme = useTheme()
  const { context, setContext, ...rest } = useContext(DisplayContext)
  const [value, setValue] = useState(
    children?.length > 0 ? valueFrom(children[0], rest) : ''
  )

  useEffect(() => {
    const { name } = attributes
    const val = value === '' ? null : value
    const converted = convertType(val, attributes.datatype)

    if (context[name] !== converted && converted) {
      setContext({ ...context, [name]: converted })
    }
  }, [attributes, context, setContext, value])

  return (
    <div css={{ margin: 'xsmall' }}>
      <span
        css={{
          ...theme.partials.text.caption,
          marginBottom: 'xxsmall',
          whiteSpace: 'nowrap',
        }}
      >
        {attributes.label}
      </span>
      <Input
        value={value || ''}
        onChange={({ target: { value } }) => setValue(value)}
        width="100%"
        maxWidth={attributes.width || 150}
        {...attributes}
      />
    </div>
  )
}
