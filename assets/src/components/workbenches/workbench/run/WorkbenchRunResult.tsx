import { WorkbenchJobResultFragment } from '../../../../generated/graphql'
import { RectangleSkeleton } from '../../../utils/SkeletonLoaders'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styled from 'styled-components'

function getWorkingTheory(result?: WorkbenchJobResultFragment | null) {
  const text = result?.workingTheory?.trim()
  return text?.length ? text : null
}

function getConclusion(result?: WorkbenchJobResultFragment | null) {
  const text = result?.conclusion?.trim()
  return text?.length ? text : null
}

export function WorkbenchRunResult({
  loading,
  result,
}: {
  loading: boolean
  result?: WorkbenchJobResultFragment | null
}) {
  if (loading)
    return (
      <RectangleSkeleton
        css={{ height: 320 }}
        $height={320}
        $width="100%"
      />
    )

  const workingTheory = getWorkingTheory(result)
  const conclusion = getConclusion(result)

  return (
    <ResultPanelSC>
      <ResultBorderSC>
        <ResultInnerSC>
          <ResultTitleSC>
            {conclusion && conclusion.length > 0
              ? 'Conclusion'
              : 'Working theory'}
          </ResultTitleSC>
          <ResultBodySC>
            <ResultContentSC>
              {conclusion && conclusion.length > 0 ? (
                <ResultMarkdown text={conclusion} />
              ) : workingTheory && workingTheory.length > 0 ? (
                <ResultMarkdown text={workingTheory} />
              ) : (
                <EmptyTextSC>No output yet.</EmptyTextSC>
              )}
            </ResultContentSC>
          </ResultBodySC>
        </ResultInnerSC>
      </ResultBorderSC>
    </ResultPanelSC>
  )
}

function ResultMarkdown({ text }: { text: string }) {
  return (
    <MarkdownSC>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
        }}
      >
        {text}
      </ReactMarkdown>
    </MarkdownSC>
  )
}

const ResultPanelSC = styled.div({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  flex: 0.66,
})

const ResultBorderSC = styled.div(({ theme }) => ({
  borderRadius: theme.borderRadiuses.medium,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: theme.borderRadiuses.medium,
    padding: '1px',
    background:
      'linear-gradient(117deg, rgba(97,112,255,0.95) 0%, rgba(227,169,102,0.95) 100%)',
    WebkitMask:
      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    pointerEvents: 'none',
  },
}))

const ResultInnerSC = styled.div(({ theme }) => ({
  borderRadius: theme.borderRadiuses.medium,
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  background: 'transparent',
}))

const ResultTitleSC = styled.div(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontSize: '12px',
  fontWeight: 400,
  letterSpacing: '1.25px',
  lineHeight: '16px',
  padding: theme.spacing.large,
  textTransform: 'uppercase',
}))

const ResultBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: `0 ${theme.spacing.large}px ${theme.spacing.large}px`,
  minHeight: 0,
  flex: 1,
}))

const ResultContentSC = styled.div(({ theme }) => ({
  color: theme.colors['text-light'],
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: '10px',
  marginRight: '-10px',
  scrollbarWidth: 'thin',
  scrollbarColor: `${theme.colors['border-fill-three']} transparent`,
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.colors['border-fill-three'],
    borderRadius: '999px',
  },
}))

const EmptyTextSC = styled.span(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontSize: '12px',
  lineHeight: '16px',
  letterSpacing: '0.5px',
}))

const MarkdownSC = styled.div(({ theme }) => ({
  color: theme.colors['text-light'],
  fontSize: '12px',
  letterSpacing: '0.25px',
  lineHeight: '20px',
  '& p': {
    margin: '0 0 8px',
  },
  '& ul, & ol': {
    margin: '0 0 8px',
    paddingLeft: '17px',
  },
  '& li': {
    marginBottom: '0',
  },
  '& h1, & h2, & h3': {
    color: theme.colors['text-light'],
    fontSize: '16px',
    fontWeight: 800,
    letterSpacing: '0.25px',
    lineHeight: '20px',
    margin: '0 0 8px',
  },
  '& h2, & h3': {
    fontSize: '12px',
    fontWeight: 800,
  },
  '& a': {
    color: theme.colors['text-light'],
    textDecoration: 'underline',
  },
  '& em': {
    fontStyle: 'italic',
  },
  '& strong': {
    fontWeight: 800,
  },
  '& code': {
    backgroundColor: theme.colors['fill-one'],
    border: theme.borders.default,
    borderRadius: theme.borderRadiuses.medium,
    color: theme.colors['text-light'],
    fontSize: '12px',
    padding: `0 ${theme.spacing.xsmall}px`,
  },
  '& pre': {
    margin: '0 0 8px',
    overflowX: 'auto',
  },
}))
