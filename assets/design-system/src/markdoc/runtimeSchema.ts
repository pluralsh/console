/*
  Pulled from @markdoc/next.js/src/runtime.js
  https://github.com/markdoc/next.js/blob/main/src/runtime.js
*/

import { type Config } from '@markdoc/markdoc'

function displayName(name: string) {
  // Pascal case
  return name
    .match(/[a-z]+/gi)
    .map((word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase())
    .join('')
}

function transformRecord(config: Record<string, any>) {
  const output: Record<string, any> = {}
  const components: Record<string, any> = {}

  if (config) {
    Object.entries(config).forEach(([name, registration]) => {
      if (output[name]) {
        throw new Error(`"${name}" has already been declared`)
      }

      const componentName = registration.render ? displayName(name) : undefined

      output[name] = {
        ...registration,
        render: componentName,
      }

      if (componentName) {
        components[componentName] = registration.render
      }
    })
  }

  return { output, components }
}

export const getSchema = function getSchema(schema: Config) {
  const { output: tags, components: tagComponents } = transformRecord(
    schema.tags
  )

  const { output: nodes, components: nodeComponents } = transformRecord(
    schema.nodes
  )

  return {
    ...schema,
    tags,
    nodes,
    components: {
      ...tagComponents,
      ...nodeComponents,
    },
  }
}

export const defaultObject = function defaultObject(o: Record<string, any>) {
  if (Object.prototype.hasOwnProperty.call(o, 'default')) return o.default

  return o || {}
}
