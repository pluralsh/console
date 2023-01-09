import { Card } from '@pluralsh/design-system'

import { Flex, H2 } from 'honorable'

import PropWide from 'components/utils/PropWide'

import { LabelPairsSection } from 'components/utils/LabelPairsSection'

import { ComponentStatus } from '../../misc'

export default function Metadata({
  component,
  metadata: {
    name, namespace, labels, annotations,
  },
}) {
  return (
    <Flex direction="column">
      <H2
        subtitle1
        marginBottom="medium"
      >Metadata
      </H2>
      <Card padding="large">
        <Flex
          direction="column"
          gap="large"
        >
          <div>
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
              <>
                {component?.group || 'v1'}/{component?.kind}
              </>
            </PropWide>
            <PropWide
              title="status"
              fontWeight={600}
            >
              <ComponentStatus status={component?.status} />
            </PropWide>
          </div>
          <LabelPairsSection
            vals={labels}
            title="Labels"
          />
          <LabelPairsSection
            vals={annotations}
            title="Annotations"
          />
        </Flex>
      </Card>
    </Flex>
  )
}

