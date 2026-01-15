import { Card, Code, Flex, Markdown } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import { ChatTypeAttributes } from 'generated/graphql'
import isJson from 'is-json'
import styled, { useTheme } from 'styled-components'

type ToolCallContentProps = {
  content: string
  attributes?: Nullable<ChatTypeAttributes>
}

export enum MessageFormat {
  Json = 'json',
  Markdown = 'markdown',
}

export function messageFormat(message: string): MessageFormat {
  if (isJson(message)) return MessageFormat.Json
  return MessageFormat.Markdown
}

export function prettifyJson(message: string): string {
  try {
    return JSON.stringify(JSON.parse(message), null, 2)
  } catch {
    return message
  }
}

export function ToolCallContent({ content, attributes }: ToolCallContentProps) {
  const { spacing } = useTheme()
  const format = messageFormat(content)

  return (
    <Flex
      direction="column"
      gap="small"
      width="100%"
    >
      {attributes?.tool?.arguments && (
        <div>
          <Body2P $color="text-light">Arguments:</Body2P>
          <ToolContentBoxSC>
            <Code
              language="json"
              showHeader={false}
              css={{ height: '100%', background: 'none' }}
            >
              {JSON.stringify(attributes.tool.arguments, null, 2)}
            </Code>
          </ToolContentBoxSC>
        </div>
      )}
      <div>
        <Body2P $color="text-light">Response:</Body2P>
        <ToolContentBoxSC>
          {format === MessageFormat.Json ? (
            <Code
              language="json"
              showHeader={false}
              css={{ height: '100%', background: 'none' }}
            >
              {prettifyJson(content)}
            </Code>
          ) : (
            <Card
              css={{
                padding: spacing.medium,
                background: 'none',
                height: '100%',
              }}
            >
              <Markdown text={content} />
            </Card>
          )}
        </ToolContentBoxSC>
      </div>
    </Flex>
  )
}

export const ToolContentBoxSC = styled.div(({ theme }) => ({
  maxHeight: 324,
  marginTop: theme.spacing.xxsmall,

  maxWidth: '100%',
  overflow: 'auto',
  background: theme.colors['fill-two'],
  borderRadius: theme.borderRadiuses.large,
}))
