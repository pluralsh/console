import { Card, Code, Flex, Markdown } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { ChatTypeAttributes } from 'generated/graphql'
import isJson from 'is-json'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'

export function useSlimToolCodeCss() {
  const { colors } = useTheme()
  return {
    overflow: 'auto',
    minHeight: 0,
    '& > div > div:first-child': {
      minHeight: 36,
      padding: 8,
      color: colors['text-light'],
    },
    '& > div > div:first-child svg': {
      display: 'none',
    },
  } as const
}

export function ToolCallContent({
  content,
  attributes,
  customResultBody,
}: {
  content: string
  attributes: Nullable<ChatTypeAttributes>
  customResultBody?: ReactNode
}) {
  const { spacing } = useTheme()
  const slimCodeCss = useSlimToolCodeCss()

  return (
    <Flex
      direction="column"
      gap="small"
      width="100%"
      minHeight={0}
      marginTop={spacing.xsmall}
    >
      {attributes?.tool?.arguments && (
        <Code
          language="json"
          title="Arguments"
          css={slimCodeCss}
        >
          {JSON.stringify(attributes.tool.arguments, null, 2)}
        </Code>
      )}
      {customResultBody ? (
        <>
          <CaptionP $color="text-light">Response</CaptionP>
          {customResultBody}
        </>
      ) : isJson(content) ? (
        <Code
          fillLevel={2}
          language={content.length < 25_000 ? 'json' : undefined}
          title="Response"
          showHeader
          css={slimCodeCss}
        >
          {prettifyJsonStr(content)}
        </Code>
      ) : (
        <>
          <CaptionP $color="text-light">Response</CaptionP>
          <Card
            fillLevel={2}
            css={{
              padding: spacing.small,
              maxHeight: 260,
              overflow: 'auto',
              minHeight: 0,
            }}
          >
            <Markdown
              text={content}
              css={{ whiteSpace: 'pre-line' }}
            />
          </Card>
        </>
      )}
    </Flex>
  )
}

function prettifyJsonStr(message: string): string {
  try {
    return JSON.stringify(JSON.parse(message), null, 2)
  } catch {
    return message
  }
}
