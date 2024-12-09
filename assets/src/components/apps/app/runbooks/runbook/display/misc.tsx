import jp from 'jsonpath'

import { deepFetch } from 'utils/graphql'

export function valueFrom(
  { attributes: { datasource, path, doc } },
  { datasources }
) {
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

export const query = (object, path) => jp.query(object, `$.${path}`)[0]

export function extract(data, doc) {
  if (!doc) return data

  const raw = deepFetch(data, doc)

  return JSON.parse(raw)
}
