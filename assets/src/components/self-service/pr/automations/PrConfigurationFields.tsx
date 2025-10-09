import {
  Chip,
  Flex,
  FormField,
  HelpIcon,
  Tooltip,
} from '@pluralsh/design-system'
import upperFirst from 'lodash/upperFirst'

import { PrAutomationFragment } from 'generated/graphql'
import { useTheme } from 'styled-components'

import { PrConfigurationInput } from './PrConfigurationInput'
import { conditionIsMet, PrConfigPageData } from './prConfigurationUtils'
import { Body2P, Body1P } from 'components/utils/typography/Text'

export function PrConfigurationFields({
  configuration,
  configVals,
  setConfigVals,
  pageData,
}: {
  configuration?: PrAutomationFragment['configuration']
  configVals: Record<string, string>
  setConfigVals: (vals: Record<string, string>) => void
  pageData?: PrConfigPageData
}) {
  const { colors } = useTheme()
  return (
    <Flex
      direction="column"
      overflow="hidden"
      gap="medium"
    >
      {pageData && pageData.pages.length > 1 ? (
        <PageSelector pageData={pageData} />
      ) : (
        <Body1P>Provide some basic configuration for this PR:</Body1P>
      )}
      <Flex
        direction="column"
        gap="medium"
        overflow="auto"
      >
        {(configuration || [])
          .filter((cfg) =>
            pageData ? (cfg?.page ?? 0) === pageData.curPage : true
          )
          .map((cfg) => {
            if (!cfg) return null

            const { name, documentation, longform, optional, displayName } = cfg

            if (!name || !conditionIsMet(cfg?.condition, configVals)) {
              return null
            }
            const setValue = (value: string) => {
              setConfigVals({ ...configVals, [name]: value })
            }

            return (
              <FormField
                key={name}
                required={!optional}
                label={upperFirst(displayName || name)}
                hint={upperFirst(documentation || '')}
                caption={
                  !longform ? undefined : (
                    <Tooltip
                      placement="top"
                      displayOn="click"
                      label={longform}
                    >
                      <Flex
                        align="center"
                        cursor="pointer"
                      >
                        <HelpIcon
                          size={16}
                          color={colors['action-link-inline']}
                        >
                          Help
                        </HelpIcon>
                      </Flex>
                    </Tooltip>
                  )
                }
              >
                <PrConfigurationInput
                  config={cfg}
                  value={configVals[name] || ''}
                  setValue={setValue}
                />
              </FormField>
            )
          })}
      </Flex>
    </Flex>
  )
}

function PageSelector({
  pageData,
}: {
  pageData: {
    pages: number[]
    curPage: number
    goToPage: (page: number) => void
    vistedPages: Set<number>
  }
}) {
  const { colors } = useTheme()
  const { pages, curPage, goToPage, vistedPages } = pageData
  return (
    <Flex
      gap="xsmall"
      align="center"
      alignSelf="flex-end"
    >
      <Body2P $color="text-xlight">Page:</Body2P>
      {pages.map((page) => (
        <Chip
          key={page}
          condensed
          onClick={() => goToPage(page)}
          severity={curPage === page ? 'info' : 'success'}
          inactive={!vistedPages.has(page)}
          clickable={curPage !== page}
          css={{
            transition: 'background 0.16s ease-in-out',
            '&:hover': { background: colors['fill-one-hover'] },
          }}
        >
          {page}
        </Chip>
      ))}
    </Flex>
  )
}
