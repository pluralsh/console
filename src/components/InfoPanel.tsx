import { Layer } from 'grommet'
import { Div, Flex, Span } from 'honorable'

import { Card, CloseIcon, IconFrame } from '../index'

export default function InfoPanel({
  title,
  onClose = () => {},
  width = 420,
  marginTop = '0',
  contentHeight = 300,
  contentPadding = 0,
  contentGap = 0,
  children,
}: {
  title: string
  onClose?: () => void
  width?: number | string
  marginTop?: string
  contentHeight?: number | string
  contentPadding?: number | string
  contentGap?: number | string
  children?: JSX.Element | JSX.Element[] | string
}) {
  return (
    <Layer
      plain
      onClickOutside={onClose}
      position="top-right"
      margin={{ top: marginTop }}
    >
      <Card
        fillLevel={2}
        width={width}
        overflow="hidden"
        margin="large"
      >
        <Div
          padding="medium"
          borderBottom="1px solid border-fill-two"
        >
          <Flex
            align="center"
            justify="space-between"
          >
            <Span
              fontSize={18}
              fontWeight={500}
              lineHeight="24px"
            >
              {title}
            </Span>
            <IconFrame
              clickable
              icon={<CloseIcon />}
              onClick={() => onClose()}
            />
          </Flex>
        </Div>
        <Flex
          direction="column"
          overflowY="auto"
          gap={contentGap}
          padding={contentPadding}
          height={contentHeight}
        >
          {children}
        </Flex>
      </Card>
    </Layer>
  )
}
