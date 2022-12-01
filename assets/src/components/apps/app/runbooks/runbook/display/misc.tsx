import { extract, query } from 'components/runbooks/utils'
import { useContext } from 'react'

import { DisplayContext } from '../RunbookDisplay'

import { DisplayAttachment } from './DisplayAttachment'
import { DisplayBox } from './DisplayBox'
import { DisplayButton } from './DisplayButton'
import { DisplayGraph } from './DisplayGraph'
import { DisplayImage } from './DisplayImage'
import DisplayInput from './DisplayInput'
import { DisplayLink } from './DisplayLink'
import { DisplayMarkdown } from './DisplayMarkdown'
import { DisplayTable } from './DisplayTable'
import { DisplayText } from './DisplayText'

function ValueFrom(props) {
  const display = useContext(DisplayContext)

  return valueFrom(props, display)
}

export function valueFrom({ attributes: { datasource, path, doc } }, { datasources }) {
  const object = extract(datasources[datasource], doc)

  if (!object) return null

  return query(object, path)
}

export function convertType(val, type) {
  if (!type) return val

  if (type === 'int') return parseInt(val)
  if (type === 'float') return parseFloat(val)
  if (type === 'bool') return val === 'true'

  return val
}

export function recurse(children, theme?) {
  if (!children) return null

  return children.map((c, i) => parse(c, i, theme))
}

export function parse(struct, index, theme) {
  const props = { ...struct, key: index, theme }

  switch (struct._type) {
  case 'box':
    return <DisplayBox {...props} />
  case 'attachment':
    return <DisplayAttachment {...props} />
  case 'text':
    return <DisplayText {...props} />
  case 'markdown':
    return <DisplayMarkdown {...props} />
  case 'image':
    return <DisplayImage {...props} />
  case 'link':
    return <DisplayLink {...props} />
  case 'input':
    return <DisplayInput {...props} />
  case 'button':
    return <DisplayButton {...props} />
  case 'valueFrom':
    return <ValueFrom {...props} />
  case 'timeseries':
    return <DisplayGraph {...props} />
  case 'table':
    return <DisplayTable {...props} />
  default:
    return null
  }
}
