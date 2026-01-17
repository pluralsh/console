import { Row } from '@tanstack/react-table'
import { AddonOverview } from './UpgradesConsolidatedTable'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import styled, { useTheme } from 'styled-components'
import { Card, Markdown, Tab, TabList } from '@pluralsh/design-system'
import { useRef, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { capitalize, isEmpty } from 'lodash'

enum ExpanderTab {
  Images = 'images',
  HelmChanges = 'helm changes',
  ChartUpdates = 'chart updates',
  Features = 'features',
  BreakingChanges = 'breaking changes',
}

export function UpgradesConsolidatedTableExpander({
  row,
}: {
  row: Row<AddonOverview>
}) {
  const { spacing } = useTheme()
  const tabStateRef = useRef<any>(null)
  const { callout, images, summary } = row.original
  const [selectedTab, setSelectedTab] = useState<ExpanderTab>(
    isEmpty(images) ? ExpanderTab.Images : ExpanderTab.HelmChanges
  )

  return (
    <div>
      {callout && (
        <SectionWrapperSC css={{ gap: spacing.xsmall, paddingTop: 22 }}>
          <CaptionP
            $color="text-xlight"
            css={{ userSelect: 'none' }}
          >
            Update guidance
          </CaptionP>
          <MarkdownCardSC>
            <Markdown text={callout} />
          </MarkdownCardSC>
        </SectionWrapperSC>
      )}
      <SectionWrapperSC css={{ gap: spacing.medium }}>
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: selectedTab,
            onSelectionChange: (key) => setSelectedTab(key as ExpanderTab),
          }}
        >
          {getSummaryTabs(images, summary).map((tab) => (
            <Tab key={tab.key}>{tab.label}</Tab>
          ))}
        </TabList>
        {selectedTab === ExpanderTab.Images && !isEmpty(images) && (
          <Card
            css={{
              background: 'transparent',
              padding: `${spacing.large}px ${spacing.xlarge}px`,
              overflow: 'auto',
            }}
          >
            <CaptionP
              $color="text-xlight"
              css={{ userSelect: 'none' }}
            >
              Images needed to procure:
            </CaptionP>
            {images
              ?.filter(isNonNullable)
              .map((image) => <Body2P key={image}>{image}</Body2P>)}
          </Card>
        )}
        {selectedTab !== ExpanderTab.Images && !isEmpty(summary) && (
          <MarkdownCardSC>
            <Markdown text={getTabContent(selectedTab, summary)} />
          </MarkdownCardSC>
        )}
      </SectionWrapperSC>
    </div>
  )
}

const SectionWrapperSC = styled.section(({ theme }) => ({
  borderTop: theme.borders.default,
  padding: `${theme.spacing.xsmall}px 60px ${theme.spacing.medium}px`,
  display: 'flex',
  flexDirection: 'column',
}))

const MarkdownCardSC = styled.div(({ theme }) => ({
  maxHeight: 300,
  padding: theme.spacing.medium,
  background: theme.colors['fill-one'],
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.medium,
  overflow: 'auto',
}))

function getTabContent(
  tab: ExpanderTab,
  summary: AddonOverview['summary']
): string {
  let textList: Nullable<string[]> = []
  if (tab === ExpanderTab.HelmChanges)
    textList = summary?.helmChanges ? [summary.helmChanges] : []
  else if (tab === ExpanderTab.ChartUpdates)
    textList = summary?.chartUpdates?.filter(isNonNullable)
  else if (tab === ExpanderTab.Features)
    textList = summary?.features?.filter(isNonNullable)
  else if (tab === ExpanderTab.BreakingChanges)
    textList = summary?.breakingChanges?.filter(isNonNullable)

  return `
## ${capitalize(tab)}

${isEmpty(textList) ? 'None reported.' : textList?.map((text) => `- ${text}`).join('\n')}
`
}

const getSummaryTabs = (
  images: AddonOverview['images'],
  summary: AddonOverview['summary']
) => [
  ...(isEmpty(images) ? [] : [{ key: ExpanderTab.Images, label: 'Images' }]),
  ...(isEmpty(summary)
    ? []
    : [
        { key: ExpanderTab.HelmChanges, label: 'Helm changes' },
        { key: ExpanderTab.ChartUpdates, label: 'Chart updates' },
        { key: ExpanderTab.Features, label: 'Features' },
        { key: ExpanderTab.BreakingChanges, label: 'Breaking changes' },
      ]),
]
