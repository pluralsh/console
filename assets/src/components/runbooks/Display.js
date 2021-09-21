import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Box, Text, Markdown, Anchor, ThemeContext } from 'grommet'
import { Button, SecondaryButton } from 'forge-core'
import { normalizeColor } from 'grommet/utils'
import { useMutation } from '@apollo/react-hooks'
import { EXECUTE_RUNBOOK } from './queries'
import { LabelledInput } from '../utils/LabelledInput'
import jp from 'jsonpath'

const DisplayContext = React.createContext({})

function recurse(children, theme) {
  if (!children) return null
  return children.map((c, i) => parse(c, i, theme))
}

const border = ({borderSize, borderSide, border}) => (
  (borderSize || borderSide) ? {side: borderSide, color: border, size: borderSize} : border
)

function DisplayBox({children, attributes, key}) {
  return (
    <Box key={key} {...(attributes || {})} border={border(attributes)}>
      {recurse(children)}
    </Box>
  )
}

function Attachment({children, attributes, key, theme}, i) {

  const {accent, margin, ...rest} = attributes || {}
  return (
    <Box key={key} margin={margin} border background='white'>
      <Box {...rest} style={{
        borderLeftStyle: 'solid',
        borderLeftWidth: '2px',
        borderLeftColor: accent ? normalizeColor(accent, theme) : 'rgba(35, 137, 215, 0.5)'}}>
        {recurse(children)}
      </Box>
    </Box>
  )
}

function DisplayText({attributes, value, key}) {
  const attrs = attributes || {}
  const val = attrs.value || value
  const {size, ...rest} = attrs
  return (<Text key={key} size={size || 'small'} {...rest}>{val}</Text>)
}

function DisplayMarkdown({attributes: {value, ...rest}, key}) {
  if (!value) return null

  return (
    <Markdown
      key={key}
      components={{p: {props: {size: 'small', margin: {top: 'xsmall', bottom: 'xsmall'}}}}}
      {...rest}>
      {value}
    </Markdown>
  )
}

function Image({key, attributes: {url, width, height, ...rest}}) {
  return <img key={key} alt={url} width={width || '250px'} height={height || '250px'} {...rest} src={url} />
}

function Link({value, attributes, children, key}) {
  const val = value || attributes.value
  return (
    <Anchor key={key} {...attributes}>
      <Text size='small' {...attributes}>{val ? val :  recurse(children)}</Text>
    </Anchor>
  )
}

function DisplayButton({attributes: {action, ...rest}}) {
  const [mutation] = useMutation(EXECUTE_RUNBOOK)

  if (!action) return buttonComponent(rest)

  return buttonComponent({...rest, onClick: mutation})
}

function buttonComponent({primary, key, ...props}) {
  if (primary) {
    return <Button key={key} round='xsmall' {...props} />
  }

  return <SecondaryButton key={key} round='xsmall' {...props} />
}

function Input({attributes, children}) {
  const {context, setContext} = useContext(DisplayContext)
  const [value, setValue] = useState('')
  const onChange = useCallback((val) => {
    setValue(val)
    setContext({...context, [attributes.name]: val})
  }, [context, setContext, setValue])

  const val = children ? recurse(children)[0] : ''
  console.log(val)
  useEffect(() => {
    onChange(val)
  }, [val])

  return (
    <LabelledInput
      {...attributes}
      value={value}
      onChange={({target: {value}}) => onChange(value)} />
  )
}

function ValueFrom({attributes: {datasource, path}}) {
  const {datasources} = useContext(DisplayContext)
  const object = datasources[datasource]
  if (!object) return null

  return jp.query(object, `$.${path}`)
}

function parse(struct, index, theme) {
  const props = {...struct, key: index, theme}
  switch (struct._type) {
    case "box":
      return DisplayBox(props)
    case "attachment":
      return Attachment(props)
    case "text":
      return DisplayText(props)
    case "markdown":
      return DisplayMarkdown(props)
    case "image":
      return Image(props)
    case "link":
      return Link(props)
    case "input":
      return Input(props)
    case "button":
      return DisplayButton(props)
    case "valueFrom":
      return ValueFrom(props)
    default:
      return null
  }
}

export function Display({data, root: {children, attributes}}) {
  const theme = useContext(ThemeContext)
  console.log(data)
  const datasources = useMemo(() => (
    data.reduce((acc, entry) => ({...acc, [entry.name]: entry}), {})
  ), [data])
  const [context, setContext] = useState({})

  return (
    <DisplayContext.Provider value={{datasources, context, setContext}}>
      <Box gap='xsmall' align='start' {...(attributes || {})}>
        {recurse(children, theme)}
      </Box>
    </DisplayContext.Provider>
  )
}