import { ListState } from '@react-stately/list'
import { AriaListBoxOptions } from '@react-aria/listbox'
import { useTheme } from 'styled-components'
import { animated, useTransition } from 'react-spring'
import { CSSTransition } from 'react-transition-group'

import { ListBoxUnmanaged, ListBoxUnmanagedProps } from './ListBox'
import { Popover, PopoverProps } from './ReactAriaPopover'
import { PopoverWrapper, SelectProps } from './Select'

type PopoverListBoxProps = {
  isOpen: boolean
  onClose: () => void
  listBoxState: ListState<object>
  listBoxProps: AriaListBoxOptions<object>
} & Pick<PopoverProps, 'popoverRef'> &
  Pick<ListBoxUnmanagedProps, 'listBoxRef'> &
  Pick<
    SelectProps,
    'width' | 'placement' | 'dropdownHeaderFixed' | 'dropdownFooterFixed'
  >

function PopoverListBox({
  isOpen,
  onClose,
  listBoxState,
  listBoxProps,
  listBoxRef,
  popoverRef,
  dropdownHeaderFixed,
  dropdownFooterFixed,
  width,
  placement,
}: PopoverListBoxProps) {
  const theme = useTheme()
  const transitions = useTransition(isOpen, {
    from: { opacity: 0, translateY: '-150px' },
    enter: { opacity: 1, translateY: '0' },
    leave: { opacity: 0, translateY: '-150px' },
    config: isOpen
      ? {
        mass: 0.6,
        tension: 280,
        velocity: 0.02,
      }
      : {
        mass: 0.6,
        tension: 400,
        velocity: 0.02,
        restVelocity: 0.1,
      },
  })

  return (
    <CSSTransition
      in={isOpen}
      timeout={150}
    >
      <PopoverWrapper
        isOpen={isOpen}
        width={width}
        placement={placement}
        className="popoverWrapper"
      >
        {transitions((styles, item) => item && (
          <animated.div style={{ ...styles }}>
            <Popover
              popoverRef={popoverRef}
              isOpen={isOpen}
              onClose={onClose}
            >
              <ListBoxUnmanaged
                className="listBox"
                state={listBoxState}
                headerFixed={dropdownHeaderFixed}
                footerFixed={dropdownFooterFixed}
                extendStyle={{
                  boxShadow: theme.boxShadows.moderate,
                }}
                listBoxRef={listBoxRef}
                {...listBoxProps}
              />
            </Popover>
          </animated.div>
        ))}
      </PopoverWrapper>
    </CSSTransition>
  )
}

export { PopoverListBox, PopoverListBoxProps }
