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

import { Body1P, Body2P } from 'components/utils/typography/Text'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { PrConfigurationInput } from './PrConfigurationInput'
import { conditionIsMet } from './prConfigurationUtils'

export function PrConfigurationFields({
  configuration,
  configVals,
  setConfigVals,
}: {
  configuration?: PrAutomationFragment['configuration']
  configVals: Record<string, string>
  setConfigVals: (vals: Record<string, string>) => void
}) {
  const theme = useTheme()
  const pages = Array.from(
    new Set(configuration?.map((cfg) => cfg?.page ?? 0))
  ).sort()
  const firstPage = isEmpty(pages) ? 0 : Math.min(...pages)

  const [vistedPages, setVistedPages] = useState<Set<number>>(
    new Set([firstPage])
  )
  const [curPage, setCurPage] = useState(firstPage)
  const goToPage = (page: number) => {
    setVistedPages((prev) => prev.add(page))
    setCurPage(page)
  }

  return (
    <Flex
      direction="column"
      overflow="hidden"
      gap="medium"
    >
      {pages.length > 1 ? (
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
                '&:hover': { background: theme.colors['fill-one-hover'] },
              }}
            >
              {page}
            </Chip>
          ))}
        </Flex>
      ) : (
        <Body1P>Provide some basic configuration for this PR:</Body1P>
      )}
      <Flex
        direction="column"
        gap="medium"
        overflow="auto"
      >
        {(configuration || [])
          .filter((cfg) => (cfg?.page ?? 0) === curPage)
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
                          color={theme.colors['action-link-inline']}
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
