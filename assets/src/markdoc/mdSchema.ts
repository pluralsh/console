import * as config from './config'
import * as functions from './functions'
import { getSchema } from './mdSchemaTransforms'
import * as nodes from './nodes'
import * as tags from './tags'

const baseSchema = {
  nodes,
  functions,
  tags,
  ...config,
}

export default baseSchema

const { components, ...schemaConfig } = getSchema(baseSchema)

export { components, schemaConfig as config }
