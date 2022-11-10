import fileSize from 'filesize'
import jp from 'jsonpath'

import { deepFetch } from '../../utils/graphql'
import { cpuFormat } from '../../utils/kubernetes'

export const query = (object, path) => jp.query(object, `$.${path}`)[0]

export const ValueFormats = {
  cpu: cpuFormat,
  memory: fileSize,
}

export function extract(data, doc) {
  if (!doc) return data

  const raw = deepFetch(data, doc)

  return JSON.parse(raw)
}
