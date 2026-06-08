import { Checkbox, Flex } from '@pluralsh/design-system'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import type { ReactElement } from 'react'
import { useTheme } from 'styled-components'

export function WorkbenchPromptSupervisionOption({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: ReactElement
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const theme = useTheme()

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      css={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.xxsmall,
        width: '100%',
        padding: theme.spacing.xxsmall,
        border: 'none',
        borderRadius: theme.borderRadiuses.medium,
        backgroundColor: 'unset',
        cursor: 'pointer',
        textAlign: 'left',
        '&:hover': {
          backgroundColor: theme.colors['fill-three-hover'],
        },
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          small
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </div>
      <Flex
        direction="column"
        gap="xxsmall"
        flex={1}
        minWidth={0}
      >
        <Flex
          align="center"
          gap="xsmall"
        >
          {icon}
          <Body2BoldP $color="text">{label}</Body2BoldP>
        </Flex>
        <Body2P css={{ color: theme.colors['text-xlight'] }}>{hint}</Body2P>
      </Flex>
    </button>
  )
}
