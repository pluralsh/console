import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Box, Text, Markdown, Anchor, ThemeContext } from 'grommet'
import { Button, SecondaryButton } from 'forge-core'
import { normalizeColor } from 'grommet/utils'
import { useMutation } from '@apollo/react-hooks'
import { EXECUTE_RUNBOOK } from './queries'
import { Graph, GraphHeader } from '../utils/Graph'
import { LabelledInput } from '../utils/LabelledInput'
import { useHistory, useParams } from 'react-router'
import { HeaderItem } from '../kubernetes/Pod'
import { extract, query, ValueFormats } from './utils'
import { ActionPortal } from './Runbook'

const DisplayContext = React.createContext({})

function recurse(children, theme) {
  if (!children) return null
  return children.map((c, i) => parse(c, i, theme))
}

const border = ({borderSize, borderSide, border}) => (
  (borderSize || borderSide) ? {side: borderSide, color: border, size: borderSize} : border
)

function DisplayBox({children, attributes}) {
  return (
    <Box {...(attributes || {})} border={border(attributes)}>
      {recurse(children)}
    </Box>
  )
}

function Attachment({children, attributes, theme}, i) {

  const {accent, margin, ...rest} = attributes || {}
  return (
    <Box margin={margin} border background='white'>
      <Box {...rest} style={{
        borderLeftStyle: 'solid',
        borderLeftWidth: '2px',
        borderLeftColor: accent ? normalizeColor(accent, theme) : 'rgba(35, 137, 215, 0.5)'}}>
        {recurse(children)}
      </Box>
    </Box>
  )
}

function DisplayText({attributes, value}) {
  const attrs = attributes || {}
  const val = attrs.value || value
  const {size, ...rest} = attrs
  return (<Text size={size || 'small'} {...rest}>{val}</Text>)
}

function DisplayMarkdown({attributes: {value, ...rest}}) {
  if (!value) return null

  return (
    <Markdown
      components={{p: {props: {size: 'small', margin: {top: 'xsmall', bottom: 'xsmall'}}}}}
      {...rest}>
      {value}
    </Markdown>
  )
}

function Image({attributes: {url, width, height, ...rest}}) {
  return <img alt={url} width={width || '250px'} height={height || '250px'} {...rest} src={url} />
}

function Link({value, attributes, children}) {
  const val = value || attributes.value
  return (
    <Anchor {...attributes}>
      <Text size='small' {...attributes}>{val ? val :  recurse(children)}</Text>
    </Anchor>
  )
}

function DisplayButton({attributes: {action, headline, ...rest}}) {
  let hist = useHistory()
  const {namespace, name} = useParams()
  const {context} = useContext(DisplayContext)
  const [mutation, {loading}] = useMutation(EXECUTE_RUNBOOK, {
    variables: {name, namespace, input: {context: JSON.stringify(context), action}},
    onCompleted: ({executeRunbook: {redirectTo}}) => {
      if (redirectTo) {
        hist.push(redirectTo)
      }
    }
  })

  if (!action) return buttonComponent(rest)

  if (headline) {
    return (
      <ActionPortal>
        {buttonComponent({...rest, loading, onClick: mutation})}
      </ActionPortal>
    )
  }

  return buttonComponent({...rest, loading, onClick: mutation})
}

function buttonComponent({primary, key, ...props}) {
  if (primary) {
    return <Button key={key} round='xsmall' {...props} />
  }

  return <SecondaryButton key={key} round='xsmall' {...props} />
}

function convertType(val, type) {
  if (!type) return val

  if (type === 'int') return parseInt(val)
  if (type === 'float') return parseFloat(val)
  if (type === 'bool') return val === 'true'

  return val
}

function Input({attributes, children}) {
  const {context, setContext, ...rest} = useContext(DisplayContext)
  const [value, setValue] = useState(children && children.length > 0 ? valueFrom(children[0], rest) : '')
  useEffect(() => {
    const name = attributes.name
    const val = value === '' ? null : value
    const converted = convertType(val, attributes.datatype)
    if (context[name] !== converted && converted) {
      setContext({...context, [name]: converted})
    }
  }, [attributes, context, setContext, value])

  return (
    <LabelledInput
      {...attributes}
      value={`${value}`}
      onChange={setValue} />
  )
}

function valueFrom({attributes: {datasource, path, doc}}, {datasources}) {
  const object = extract(datasources[datasource], doc)
  if (!object) return null

  return query(object, path)
}

function ValueFrom(props) {
  const display = useContext(DisplayContext)
  return valueFrom(props, display)
}

const convertVals = (values) => values.map(({timestamp, value}) => ({x: new Date(timestamp * 1000), y: parseFloat(value)}))

function formatLegend(legend, properties) {
  if (!properties) return legend

  return Object.entries(properties)
          .reduce((leg, [k, v]) => leg.replace(`$${k}`, v), legend)
}

function Timeseries({attributes: {datasource, label}}) {
  const {datasources} = useContext(DisplayContext)
  const {metrics, format} = useMemo(() => {
    const {prometheus, source} = datasources[datasource]
    const legend = source && source.prometheus.legend
    const format = source && source.prometheus.format
    const metrics = prometheus.map(({metric, values}) => ({
      id: formatLegend(legend, metric), 
      data: convertVals(values)
    }))

    return {metrics, format: ValueFormats[format] || ((v) => v)}
  }, [datasources, datasource])
  
  return (
    <Box height='300px' width='500px'>
      <GraphHeader text={label} />
      <Graph data={metrics} yFormat={format} tickRotation={45} />
    </Box>
  )
}


function TableRow({data, columns}) {
  return (
    <Box direction='row' align='center' pad='small' gap='xsmall' border={{side: 'bottom', color: 'cardDarkLight'}}>
      {columns.map(({attributes: {header, width, path}}) => (
        <HeaderItem key={header} text={query(data, path)} width={width} nobold truncate />
      ))}
    </Box>
  )
}

function Table({attributes: {datasource, width, height, path}, children}) {
  const {datasources} = useContext(DisplayContext)
  const entries = path ? query(datasources[datasource], path) : datasources[datasource]

  return (
    <Box width={width} height={height}>
      <Box direction='row' align='center' border={{side: 'bottom', color: 'cardDarkLight'}} pad='small' gap='xsmall'>
        {children.map(({attributes: {header, width}}) => (
          <HeaderItem key={header} text={header} width={width} />
        ))}
      </Box>
      {entries.map((data, ind) => (
        <TableRow key={`${ind}`} data={data} columns={children} />
      ))}
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
    case "table":
      return <Table {...props} />
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