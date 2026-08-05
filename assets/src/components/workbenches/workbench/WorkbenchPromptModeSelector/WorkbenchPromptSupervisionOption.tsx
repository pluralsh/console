import { Checkbox, Flex } from '@pluralsh/design-system'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
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
        gap: theme.spacing.xsmall,
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
        <CaptionP css={{ color: theme.colors['text-xlight'] }}>{hint}</CaptionP>
      </Flex>
    </button>
  )
}
