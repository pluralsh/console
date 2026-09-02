import {
  BrainIcon,
  Button,
  Card,
  Divider,
  Flex,
  Markdown,
  ReturnIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import { KnowledgeEvidenceFragment } from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'
import { BasicEvidenceLine, EvidenceWrapperSC } from './LogsEvidencePanel'

export function KnowledgeEvidencePanel({
  knowledge,
  isTable = true,
}: {
  knowledge: KnowledgeEvidenceFragment[]
  isTable?: boolean
}) {
  const { spacing, colors } = useTheme()
  const [selectedItem, setSelectedItem] =
    useState<KnowledgeEvidenceFragment | null>(null)

  return (
    <EvidenceWrapperSC $table={isTable}>
      {selectedItem ? (
        <WrapWithIf
          condition={!isTable}
          wrapper={<Card css={{ maxHeight: 300, overflow: 'auto' }} />}
        >
          <Flex padding="medium">
            <Button
              secondary
              endIcon={<ReturnIcon />}
              onClick={() => setSelectedItem(null)}
              width="100%"
            >
              Back to all knowledge evidence
            </Button>
          </Flex>
          <div css={{ padding: spacing.medium }}>
            {selectedItem.observations?.map(
              (observation, i) =>
                observation && (
                  <>
                    <Markdown
                      key={i}
                      text={observation}
                    />
                    <Divider
                      backgroundColor={colors['border-fill-two']}
                      margin="medium"
                    />
                  </>
                )
            )}
          </div>
        </WrapWithIf>
      ) : (
        knowledge.map((item, i) => (
          <WrapWithIf
            key={i}
            condition={!isTable}
            wrapper={<Card clickable />}
          >
            <BasicEvidenceLine
              key={i}
              icon={<BrainIcon />}
              content={item.name}
              onClick={() => setSelectedItem(item)}
              isTable={isTable}
            />
          </WrapWithIf>
        ))
      )}
    </EvidenceWrapperSC>
  )
}
