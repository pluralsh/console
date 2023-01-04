import { Card, Chip } from '@pluralsh/design-system'

import { Flex, H2, H3 } from 'honorable'

import PropWide from 'components/utils/PropWide'

import { ComponentStatus } from '../misc'

export default function ComponentInfoMetadata({
  component,
  metadata: {
    name, namespace, labels, annotations,
  },
}) {
  return (
    <>
      <H2 marginBottom="medium">Metadata</H2>
      <Card padding="large">
        <PropWide
          title="name"
          fontWeight={600}
        >
          {name}
        </PropWide>
        <PropWide
          title="namespace"
          fontWeight={600}
        >
          {namespace}
        </PropWide>
        <PropWide
          title="kind"
          fontWeight={600}
        >
          <>{component?.group || 'v1'}/{component?.kind}</>
        </PropWide>
        <PropWide
          title="status"
          fontWeight={600}
        >
          <ComponentStatus status={component?.status} />
        </PropWide>
        <H3
          body1
          fontWeight={600}
          marginBottom="medium"
          marginTop="large"
        >
          Labels
        </H3>
        <Flex
          gap="xsmall"
          wrap="wrap"
        >
          {labels.map(({ name, value }, i) => (
            <Chip key={i}>{name}: {value}</Chip>
          ))}
          {(!labels || labels.length === 0) && 'There are no labels.'}
        </Flex>
        <H3
          body1
          fontWeight={600}
          marginBottom="medium"
          marginTop="large"
        >
          Annotations
        </H3>
        <Flex
          gap="xsmall"
          wrap="wrap"
        >
          {annotations.map(({ name, value }, i) => (
            <Chip key={i}>{name}: {value}</Chip>
          ))}
          {(!annotations || annotations.length === 0) && 'There are no annotations.'}
        </Flex>
      </Card>
    </>
  )
}
