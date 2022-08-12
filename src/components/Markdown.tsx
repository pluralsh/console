import { Children, forwardRef, useMemo } from 'react'
import {
  A, Blockquote, Code, Div, H1, H2, H3, H4, H5, H6, Img, Li, Ol, P, Span, Ul,
} from 'honorable'
import ReactMarkdown from 'react-markdown'

import rehypeRaw from 'rehype-raw'

import MultilineCode from './Code'

type MarkdownProps = {
  text: string,
  gitUrl: string,
}

const propTypes = {}

const toReactMarkdownComponent = ({ component: Component, props }: any) => function renderComponent(p: any) {
  return (
    <Component
      {...{
        ...p,
        ...props,
      }}
    />
  )
}

function getLastStringChild(children: any, depth = 0): any {
  let lastChild = null

  Children.forEach(children, child => {
    if (typeof child === 'string') {
      lastChild = child
    }
    else if (child.props && child.props.children && depth < 3) {
      lastChild = getLastStringChild(child.props.children, depth + 1)
    }
  })

  return lastChild
}

function MarkdownPreformatted({ children, ...props }: any) {
  let lang

  if (children.props?.className?.startsWith('lang-')) {
    lang = children.props.className.slice(5)
  }
  const stringChild = getLastStringChild(children) || ''

  return (
    <Div mb={1}>
      <MultilineCode
        language={lang}
        {...props}
      >
        {stringChild}
      </MultilineCode>
    </Div>
  )
}

function MarkdownImage({ src, gitUrl, ...props }: any) {
  // Convert local image paths to full path on github
  // Only works if primary git branch is named "master"
  if (gitUrl && src && !src.match(/^https*/)) {
    src = `${gitUrl}/raw/master/${src}`
  }

  console.log(props)

  return (
    <Img
      src={src}
      maxWidth="100%"
      display="inline"
      {...props}
    />
  )
}

function MarkdownRef({ text, gitUrl }: MarkdownProps) {
  return useMemo(() => (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      components={{
        blockquote: toReactMarkdownComponent({
          component: Blockquote,
          props: {
            borderLeft: '4px solid',
            borderColor: 'border',
            mx: 0,
            pl: '1em',
          },
        }),
        ul: toReactMarkdownComponent({
          component: Ul,
          props: { paddingLeft: 'xlarge', marginBottom: 'small' },
        }),
        ol: toReactMarkdownComponent({
          component: Ol,
          props: { paddingLeft: 'xlarge', marginBottom: 'small' },
        }),
        li: toReactMarkdownComponent({
          component: Li,
          props: { body2: true, marginTop: 'xxsmall' },
        }),
        h1: toReactMarkdownComponent({
          component: H1,
          props: {
            title2: true,
            color: 'text',
            marginTop: 'large',
            marginBottom: 'small',
            ':first-of-type': { marginTop: '0px' },
          },
        }),
        h2: toReactMarkdownComponent({
          component: H2,
          props: {
            subtitle1: true,
            color: 'text',
            marginTop: 'large',
            marginBottom: 'small',
            ':first-of-type': { marginTop: '0px' },
          },
        }),
        h3: toReactMarkdownComponent({
          component: H3,
          props: {
            subtitle2: true,
            color: 'text',
            bold: true,
            marginTop: 'large',
            marginBottom: 'small',
            ':first-of-type': { marginTop: '0px' },
          },
        }),
        h4: toReactMarkdownComponent({
          component: H4,
          props: {
            body1: true,
            color: 'text',
            bold: true,
            marginTop: 'large',
            marginBottom: 'small',
            ':first-of-type': { marginTop: '0px' },
          },
        }),
        h5: toReactMarkdownComponent({
          component: H5,
          props: {
            body1: true,
            color: 'text',
            bold: true,
            marginTop: 'large',
            marginBottom: 'small',
            ':first-of-type': { marginTop: '0px' },
          },
        }),
        h6: toReactMarkdownComponent({
          component: H6,
          props: {
            body1: true,
            bold: true,
            color: 'text',
            marginTop: 'large',
            marginBottom: 'small',
            ':first-of-type': { marginTop: '0px' },
          },
        }),
        img: props => (
          <MarkdownImage
            {...{
              ...props,
              ...{
                gitUrl,
                style: { maxWidth: '100%' },
              },
            }}
          />
        ),
        p: toReactMarkdownComponent({
          component: P,
          props: { body2: true, marginBottom: 'medium' },
        }),
        div: toReactMarkdownComponent({
          component: Div,
          props: { body2: true, marginBottom: 'medium' },
        }),
        a: toReactMarkdownComponent({
          component: A,
          props: {
            inline: true,
            display: 'inline',
            target: '_blank',
          },
        }),
        span: toReactMarkdownComponent({
          component: Span, props: { style: { verticalAlign: 'bottom' } },
        }),
        code: toReactMarkdownComponent({ component: Code, props: { marginBottom: 'medium' } }),
        pre: toReactMarkdownComponent({ component: MarkdownPreformatted, props: { marginBottom: 'medium' } }),
      }}
    >
      {text}
    </ReactMarkdown>
  ), [gitUrl, text])
}

const Markdown = forwardRef(MarkdownRef)

Markdown.propTypes = propTypes

export default Markdown
