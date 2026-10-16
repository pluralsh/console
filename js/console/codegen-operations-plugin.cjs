// typescript-react-apollo's `documentMode: external` reads documents as
// `Operations.<operationName>`, while typed-document-node exports them as
// `<OperationName>Document`. This plugin emits the re-exports that bridge the two.
const { convertFactory } = require('@graphql-codegen/visitor-plugin-common')

const convert = convertFactory({})

module.exports = {
  plugin(_schema, documents) {
    return documents
      .flatMap(({ document }) => document?.definitions ?? [])
      .filter((def) => def.kind === 'OperationDefinition' && def.name)
      .map(
        (def) =>
          `export { ${convert(def)}Document as ${def.name.value} } from './graphql-documents'`
      )
      .join('\n')
  },
}
