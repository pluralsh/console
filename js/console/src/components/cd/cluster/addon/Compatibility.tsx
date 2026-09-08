import { memo } from 'react'
import { useTheme } from 'styled-components'
import { CheckIcon, CloseIcon, IconFrame } from '@pluralsh/design-system'

export const Compatibility = memo(
  ({
    isCompatible,
    isCurrentVersion,
  }: {
    isCompatible: boolean
    isCurrentVersion: boolean
  }) => {
    const theme = useTheme()
    const label = isCurrentVersion
      ? 'Current'
      : isCompatible
        ? 'Compatible'
        : 'Not compatible'

    return (
      <IconFrame
        type={isCurrentVersion ? 'floating' : 'tertiary'}
        tooltip={label}
        textValue={label}
        icon={
          isCompatible ? (
            <CheckIcon
              color={theme.colors['icon-success']}
              size={16}
            />
          ) : (
            <CloseIcon
              color={theme.colors['icon-disabled']}
              size={16}
            />
          )
        }
        css={{
          alignSelf: 'center',
          borderRadius: '50%',
          height: 43,
          width: 43,
        }}
      />
    )
  }
)
