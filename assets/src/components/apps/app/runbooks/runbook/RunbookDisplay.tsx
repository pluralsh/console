import {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  Anchor,
  Box,
  Markdown,
  Text,
  ThemeContext,
} from 'grommet'
import { normalizeColor } from 'grommet/utils'

import { HeaderItem } from '../../../../kubernetes/Pod'

import { extract, query } from '../../../../runbooks/utils'

import DisplayInput from './display/DisplayInput'
import { DisplayGraph } from './display/DisplayGraph'
import { DisplayButton } from './display/DisplayButton'

export const DisplayContext = createContext<any>({})

function recurse(children, theme?) {
  if (!children) return null

  return children.map((c, i) => parse(c, i, theme))
}

const border = ({ borderSize, borderSide, border }) => (
  (borderSize || borderSide) ? { side: borderSide, color: border, size: borderSize } : border
)

function DisplayBox({ children, attributes }) {
  return (
    <Box
      {...(attributes || {})}
      border={border(attributes)}
    >
      {recurse(children)}
    </Box>
  )
}

function Attachment({ children, attributes, theme }) {
  const { accent, margin, ...rest } = attributes || {}

  return (
    <Box
      margin={margin}
      border
      background="white"
    >
      <Box
        {...rest}
        style={{
          borderLeftStyle: 'solid',
          borderLeftWidth: '2px',
          borderLeftColor: accent ? normalizeColor(accent, theme) : 'rgba(35, 137, 215, 0.5)',
        }}
      >
        {recurse(children)}
      </Box>
    </Box>
  )
}

function DisplayText({ attributes, value }) {
  const attrs = attributes || {}
  const val = attrs.value || value
  const { size, ...rest } = attrs

  return (
    <Text
      size={size || 'small'}
      {...rest}
    >{val}
    </Text>
  )
}

function DisplayMarkdown({ attributes: { value, ...rest } }) {
  if (!value) return null

  return (
    <Markdown
      components={{ p: { props: { size: 'small', margin: { top: 'xsmall', bottom: 'xsmall' } } } }}
      {...rest}
    >
      {value}
    </Markdown>
  )
}

function Image({
  attributes: {
    url, width, height, ...rest
  },
}) {
  return (
    <img
      alt={url}
      width={width || '250px'}
      height={height || '250px'}
      {...rest}
      src={url}
    />
  )
}

function Link({ value, attributes, children }) {
  const val = value || attributes.value

  return (
    <Anchor {...attributes}>
      <Text
        size="small"
        {...attributes}
      >{val || recurse(children)}
      </Text>
    </Anchor>
  )
}

export function convertType(val, type) {
  if (!type) return val

  if (type === 'int') return parseInt(val)
  if (type === 'float') return parseFloat(val)
  if (type === 'bool') return val === 'true'

  return val
}

export function valueFrom({ attributes: { datasource, path, doc } }, { datasources }) {
  const object = extract(datasources[datasource], doc)

  if (!object) return null

  return query(object, path)
}

function ValueFrom(props) {
  const display = useContext(DisplayContext)

  return valueFrom(props, display)
}

function TableRow({ data, columns }) {
  return (
    <Box
      direction="row"
      align="center"
      pad="small"
      gap="xsmall"
      border={{ side: 'bottom', color: 'cardDarkLight' }}
    >
      {columns.map(({ attributes: { header, width, path } }) => (
        <HeaderItem
          key={header}
          text={query(data, path)}
          width={width}
          nobold
          truncate
        />
      ))}
    </Box>
  )
}

function Table({
  attributes: {
    datasource, width, height, path,
  }, children,
}) {
  const { datasources } = useContext(DisplayContext)
  const entries = path ? query(datasources[datasource], path) : datasources[datasource]

  return (
    <Box
      width={width}
      height={height}
    >
      <Box
        direction="row"
        align="center"
        border={{ side: 'bottom', color: 'cardDarkLight' }}
        pad="small"
        gap="xsmall"
      >
        {children.map(({ attributes: { header, width } }) => (
          <HeaderItem
            key={header}
            text={header}
            width={width}
            nobold={undefined}
            truncate={undefined}
          />
        ))}
      </Box>
      {entries.map((data, ind) => (
        <TableRow
          key={`${ind}`}
          data={data}
          columns={children}
        />
      ))}
    </Box>
  )
}

function parse(struct, index, theme) {
  const props = { ...struct, key: index, theme }

  switch (struct._type) {
  case 'box':
    return <DisplayBox {...props} />
  case 'attachment':
    return <Attachment {...props} />
  case 'text':
    return <DisplayText {...props} />
  case 'markdown':
    return <DisplayMarkdown {...props} />
  case 'image':
    return <Image {...props} />
  case 'link':
    return <Link {...props} />
  case 'input':
    return <DisplayInput {...props} />
  case 'button':
    return <DisplayButton {...props} />
  case 'valueFrom':
    return <ValueFrom {...props} />
  case 'timeseries':
    return <DisplayGraph {...props} />
  case 'table':
    return <Table {...props} />
  default:
    return null
  }
}

export function RunbookDisplay({ data, root: { children, attributes } }) {
  const theme = useContext(ThemeContext)
  const datasources = useMemo(() => (
    data.reduce((acc, entry) => ({ ...acc, [entry.name]: entry }), {})
  ), [data])
  const [context, setContext] = useState({})

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <DisplayContext.Provider value={{ datasources, context, setContext }}>
      <Box
        flex={false}
        gap="xsmall"
        align="start"
        {...(attributes || {})}
      >
        {recurse(children, theme)}
      </Box>
    </DisplayContext.Provider>
  )
}
