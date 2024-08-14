import { CloseIcon, Modal } from '@pluralsh/design-system'
import { Div, Flex, Span } from 'honorable'

export function LogsInfoPanel({
  title,
  subtitle,
  onClose = (_) => {},
  contentHeight = 300,
  children,
}) {
  return (
    <Modal
      open
      size="medium"
      onClose={onClose}
    >
      <Div
        height={80}
        padding="medium"
        borderBottom="1px solid border-fill-two"
      >
        <Flex justify="space-between">
          <Span
            fontSize={18}
            fontWeight={500}
            lineHeight="24px"
          >
            {title}
          </Span>
          <CloseIcon
            cursor="pointer"
            onClick={(e) => onClose(e)}
          />
        </Flex>
        <Div
          body2
          color="text-xlight"
        >
          {subtitle}
        </Div>
      </Div>
      <Div
        overflowY="auto"
        height={contentHeight}
      >
        {children}
      </Div>
    </Modal>
  )
}
