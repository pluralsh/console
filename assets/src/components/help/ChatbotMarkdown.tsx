import { Children, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  type CodeProps,
  type LiProps,
  type UnorderedListProps,
} from 'react-markdown/lib/ast-to-react'
import styled from 'styled-components'

// import { InlineCode, Code as MultilineCode } from '@pluralsh/design-system'
import { Merge } from 'type-fest'

type MarkdownProps = {
  text: string
  gitUrl?: string
  mainBranch?: string
}

const render = ({ component: Component, props: extraProps }: any) =>
  function renderComponent({ node: _, ...props }: any) {
    return (
      <Component
        {...{
          ...props,
          ...extraProps,
        }}
      />
    )
  }

function getLastStringChild(children: any, depth = 0): any {
  let lastChild: any = null

  Children.forEach(children, (child) => {
    if (typeof child === 'string') {
      lastChild = child
    } else if (child.props && child.props.children && depth < 3) {
      lastChild = getLastStringChild(child.props.children, depth + 1)
    }
  })

  return lastChild
}

const MarkdownInlineCodeSC = styled.code(({ theme }) => ({
  ...theme.partials.text.code,
  fontWeight: 500,
  backgroundColor: theme.colors['fill-two'],
  paddingLeft: '1em',
  paddingRight: '1em',
  'paddingLeft ': '1ch',
  'paddingRight ': '1ch',
  borderRadius: theme.borderRadiuses.medium,
}))

function MdInlineCode({
  node: _node,
  inline: _inline,
  children,
  ...props
}: CodeProps) {
  const stringChild = getLastStringChild(children) || ''

  return <MarkdownInlineCodeSC {...props}>{stringChild}</MarkdownInlineCodeSC>
}

const MarkdownPreSC = styled.pre(({ theme }) => {
  const lineHeight = Number(
    theme.partials.text.code.lineHeight.match(/\d+/)?.[0] || 22
  )

  return {
    ...theme.partials.text.code,
    fontWeight: 500,
    backgroundColor: theme.colors['fill-two'],
    borderRadius: theme.borderRadiuses.medium,
    paddingTop: lineHeight / 2,
    paddingBottom: lineHeight / 2,
    paddingLeft: '2em',
    paddingRight: '2em',
    'paddingLeft ': '2ch',
    'paddingRight ': '2ch',
    whiteSpace: 'pre-wrap',
    '&:not(:last-child)': {
      marginBottom: theme.partials.text.code.lineHeight,
    },
  }
})

function MdPre({
  node: _node,
  inline: _inline,
  children,
  ...props
}: CodeProps) {
  //   let lang
  //   const className = (children as any)?.[0]?.props?.className

  //   if (className && typeof className === 'string') {
  //     lang = /language-(\w+)/.exec(className)?.[1] || ''
  //   }

  const stringChild = getLastStringChild(children) || ''

  return <MarkdownPreSC {...props}>{stringChild}</MarkdownPreSC>
}
const commonCfg = { shouldForwardProp: () => true }

const MdListSC = styled.ul.withConfig(commonCfg)(({ theme }) => ({
  ...theme.partials.reset.list,
  marginBottom: theme.partials.text.code.lineHeight,
  '&:not(:last-child)': {
    marginBottom: theme.partials.text.code.lineHeight,
  },
}))

// eslint-disable-next-line react/function-component-definition
const MdList = ({
  depth: _depth,
  ordered,
  className: _className,
  ...props
}: Merge<
  UnorderedListProps,
  {
    ordered: boolean
  }
>) => (
  <MdListSC
    {...props}
    as={ordered ? 'ol' : 'ul'}
  />
)

const MdLiSC = styled.li(({ theme }) => ({
  display: 'flex',
  gap: 0,
  '&:not(:last-child)': {
    marginBottom: theme.partials.text.code.lineHeight,
  },
  '.index': {
    flex: '0 0',
  },
  '.content': {
    flex: '1 0',
  },
}))

function MdLi({
  node: _node,
  index,
  ordered,
  checked: _checked,
  children,
  ...props
}: LiProps) {
  return (
    <MdLiSC {...props}>
      <div className="index">
        {ordered ? <>{index + 1}.&nbsp;</> : <>•&nbsp;</>}
      </div>
      <div>{children}</div>
    </MdLiSC>
  )
}
const MdP = styled.p.withConfig(commonCfg)(({ theme }) => ({
  unicodeBidi: 'embed',
  whiteSpace: 'pre-wrap',
  '&:not(:last-child)': {
    marginBottom: theme.partials.text.code.lineHeight,
  },
}))

const MdASC = styled.a.withConfig(commonCfg)(({ theme }) => ({
  display: 'inline',
  ...theme.partials.text.inlineLink,
}))

function MdA({ node: _node, ...props }) {
  return (
    <MdASC
      {...props}
      target="_blank"
      rel="noopener noreferer"
    />
  )
}

function ChatbotMarkdown({ text }: MarkdownProps) {
  return useMemo(
    () => (
      <ReactMarkdown
        allowedElements={['ul', 'ol', 'li', 'p', 'pre', 'code', 'pre', 'a']}
        unwrapDisallowed
        components={{
          ul: MdList,
          ol: MdList,
          li: MdLi,
          p: render({ component: MdP }),
          a: MdA,
          pre: MdPre,
          code: MdInlineCode,
        }}
      >
        {text}
      </ReactMarkdown>
    ),
    [text]
  )
}

export default ChatbotMarkdown
