import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Box, Text, Markdown, Anchor, ThemeContext } from 'grommet'
import { Button, SecondaryButton } from 'forge-core'
import { normalizeColor } from 'grommet/utils'
import { useMutation } from '@apollo/react-hooks'
import { EXECUTE_RUNBOOK } from './queries'
import { Graph, GraphHeader } from '../utils/Graph'
import { LabelledInput } from '../utils/LabelledInput'
import jp from 'jsonpath'
import { deepFetch } from '../../utils/graphql'
import { useParams } from 'react-router'

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
  const {namespace, name} = useParams()
  const {context} = useContext(DisplayContext)
  const [mutation, {loading}] = useMutation(EXECUTE_RUNBOOK, {
    variables: {name, namespace, input: {context: JSON.stringify(context), action}}
  })

  if (!action) return buttonComponent(rest)

  return buttonComponent({...rest, loading, onClick: mutation})
}

function buttonComponent({primary, key, ...props}) {
  if (primary) {
    return <Button key={key} round='xsmall' {...props} />
  }

  return <SecondaryButton key={key} round='xsmall' {...props} />
}

function Input({attributes, children}) {
  const {context, setContext, ...rest} = useContext(DisplayContext)
  const [value, setValue] = useState(children && children.length > 0 ? valueFrom(children[0], rest) : '')
  const onChange = useCallback((val) => {
    setValue(val)
    setContext({...context, [attributes.name]: val === '' ? null : val})
  }, [context, setContext, setValue])

  useEffect(() => {
    onChange(value)
  }, [])

  return (
    <LabelledInput
      {...attributes}
      value={value}
      onChange={onChange} />
  )
}

function valueFrom({attributes: {datasource, path, doc}}, {datasources}) {
  const object = extract(datasources[datasource], doc)
  if (!object) return null

  const res = jp.query(object, `$.${path}`)
  return res[0]
}

function extract(data, doc) {
  if (!doc) return data

  const raw = deepFetch(data, doc)
  return JSON.parse(raw) 
}

function ValueFrom(props) {
  const display = useContext(DisplayContext)
  return valueFrom(props, display)
}

const convertVals = (values) => values.map(({timestamp, value}) => ({x: new Date(timestamp * 1000), y: parseFloat(value)}))

function Timeseries({attributes: {datasource, label}}) {
  const {datasources} = useContext(DisplayContext)
  const metrics = useMemo(() => (
    datasources[datasource].prometheus.map(({values}) => ({id: label, data: convertVals(values)}))
  ), [datasources, datasource])
  
  return (
    <Box height='300px' width='500px'>
      <GraphHeader text={label} />
      <Graph data={metrics} />
    </Box>
  )
}

function parse(struct, index, theme) {
  const props = {...struct, key: index, theme}
  switch (struct._type) {
    case "box":
      return <DisplayBox {...props} />
    case "attachment":
      return <Attachment {...props} />
    case "text":
      return <DisplayText {...props} />
    case "markdown":
      return <DisplayMarkdown {...props} />
    case "image":
      return <Image {...props} />
    case "link":
      return <Link {...props} />
    case "input":
      return <Input {...props} />
    case "button":
      return <DisplayButton {...props} />
    case "valueFrom":
      return <ValueFrom {...props} />
    case "timeseries":
      return <Timeseries {...props} />
    default:
      return null
  }
}

export function Display({data, root: {children, attributes}}) {
  const theme = useContext(ThemeContext)
  const datasources = useMemo(() => (
    data.reduce((acc, entry) => ({...acc, [entry.name]: entry}), {})
  ), [data])
  const [context, setContext] = useState({})

  return (
    <DisplayContext.Provider value={{datasources, context, setContext}}>
      <Box flex={false} gap='xsmall' align='start' {...(attributes || {})}>
        {recurse(children, theme)}
      </Box>
    </DisplayContext.Provider>
  )
}