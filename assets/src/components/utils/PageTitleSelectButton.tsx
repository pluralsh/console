import { DropdownArrowIcon } from '@pluralsh/design-system'
import { Flex } from 'honorable'
import { Key, forwardRef } from 'react'
import styled, { useTheme } from 'styled-components'

export const PageTitleSelectButton = styled(
  forwardRef<any, { title: string; label: string | Key }>((props, ref) => {
    const theme = useTheme()

    return (
      <div
        ref={ref}
        css={{ cursor: 'pointer', outline: 'none' }}
        {...props}
      >
        <div>
          <div
            style={{
              color: theme.colors['text-xlight'],
              ...theme.partials.text.overline,
              textAlign: 'start',
            }}
          >
            {props.title}
          </div>
          <Flex
            direction="row"
            gap={theme.spacing.xsmall}
          >
            <div
              css={{
                ...theme.partials.text.subtitle2,
                ':hover': { textDecoration: 'underline' },
              }}
            >
              {props.label as string}
            </div>
            <DropdownArrowIcon className="dropdownIcon" />
          </Flex>
        </div>
      </div>
    )
  })
)<{ isOpen?: boolean }>(({ isOpen = false }) => ({
  '.dropdownIcon': {
    transform: isOpen ? 'scaleY(-1)' : 'scaleY(1)',
    transition: 'transform 0.1s ease',
  },
}))
