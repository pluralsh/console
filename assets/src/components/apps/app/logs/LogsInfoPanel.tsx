import { Card, CloseIcon } from '@pluralsh/design-system'
import { Layer } from 'grommet'
import { Flex } from 'honorable'
import { useTheme } from 'styled-components'

export function LogsInfoPanel({
  title,
  subtitle,
  onClose = (_) => {},
  contentHeight = 300,
  children,
  marginTop = '0',
}) {
  const theme = useTheme()

  return (
    <Layer
      plain
      onClickOutside={onClose}
      position="top-right"
      margin={{ top: marginTop }}
    >
      <Card
        fillLevel={2}
        width={420}
        overflow="hidden"
        margin={theme.spacing.large}
      >
        <div
          css={{
            height: '80px',
            padding: theme.spacing.medium,
            borderBottom: '1px solid border-fill-two',
          }}
        >
          <Flex justify="space-between">
            <span
              css={{
                fontSize: '18px',
                fontWeight: 500,
                lineHeight: '24px',
              }}
            >
              {title}
            </span>
            <CloseIcon
              cursor="pointer"
              onClick={(e) => onClose(e)}
            />
          </Flex>
          <div
            css={{
              ...theme.partials.text.body2,
              color: 'text-xlight',
            }}
          >
            {subtitle}
          </div>
        </div>
        <div
          css={{
            overflowY: 'auto',
            height: contentHeight,
          }}
        >
          {children}
        </div>
      </Card>
    </Layer>
  )
}
