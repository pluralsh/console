import { Card, CloseIcon } from '@pluralsh/design-system'
import {
  Div,
  Flex,
  Span,
  WithOutsideClick,
} from 'honorable'

export function LogsInfoPanel({
  title, subtitle, onClose = () => {}, contentHeight = 300, children, ...props
}) {
  return (
    <WithOutsideClick onOutsideClick={onClose}>
      <Card
        fillLevel={2}
        width={420}
        overflow="hidden"
        position="absolute"
        top={40}
        right={0}
        marginTop="small"
        zIndex={1000}
        {...props}
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
              onClick={onClose}
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
      </Card>
    </WithOutsideClick>
  )
}
