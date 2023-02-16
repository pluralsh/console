import { DropdownArrowIcon } from '@pluralsh/design-system'
import { Div, Flex } from 'honorable'
import { Key, forwardRef } from 'react'
import styled from 'styled-components'

export const PageTitleSelectButton = styled(forwardRef<any, {title: string, label: string | Key}>((props, ref) => (
  <Div
    ref={ref}
    cursor="pointer"
    outline="none"
    {...props}
  >
    <div>
      <Div
        color="text-xlight"
        overline
        textAlign="start"
      >
        {props.title}
      </Div>
      <Flex
        direction="row"
        gap="xsmall"
      >
        <Div
          subtitle2
          _hover={{ textDecoration: 'underline' }}
        >
          {props.label}
        </Div>
        <DropdownArrowIcon className="dropdownIcon" />
      </Flex>
    </div>
  </Div>
)))<{ isOpen?: boolean }>(({ isOpen = false }) => ({
  '.dropdownIcon': {
    transform: isOpen ? 'scaleY(-1)' : 'scaleY(1)',
    transition: 'transform 0.1s ease',
  },
}))
