import {
  Button,
  CloseIcon,
  IconFrame,
  Modal,
  useCopyText,
} from '@pluralsh/design-system'
import styled from 'styled-components'

export function datasourceQuery(input: unknown): string | null {
  const value = typeof input === 'string' ? parseJson(input) : input
  if (!value || typeof value !== 'object') return null
  const query = (value as { query?: unknown }).query
  return typeof query === 'string' && query.trim() ? query : null
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

export function QueryDefinitionModal({
  open,
  onClose,
  title,
  query,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  title: string
  query: string
  onUpdate?: () => void
}) {
  const { copied, handleCopy } = useCopyText(query, 2000)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="large"
      title={title}
      header={
        <HeaderSC>
          <TitleSC>{title}</TitleSC>
          <IconFrame
            clickable
            icon={<CloseIcon />}
            textValue="Close"
            onClick={onClose}
          />
        </HeaderSC>
      }
      actions={
        <ActionsSC>
          <Button
            secondary
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy definition'}
          </Button>
          {onUpdate && (
            <Button
              primary
              onClick={() => {
                onClose()
                onUpdate()
              }}
            >
              Update via chat
            </Button>
          )}
        </ActionsSC>
      }
    >
      <QuerySC>{query}</QuerySC>
    </Modal>
  )
}

const HeaderSC = styled.div({
  alignItems: 'center',
  display: 'flex',
  gap: 16,
  justifyContent: 'space-between',
  width: '100%',
})

const TitleSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body1,
  color: theme.colors.text,
  textTransform: 'none',
  letterSpacing: 'normal',
}))

const ActionsSC = styled.div({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
})

const QuerySC = styled.pre(({ theme }) => ({
  ...theme.partials.text.code,
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.large,
  color: theme.colors.text,
  margin: 0,
  maxHeight: 320,
  overflow: 'auto',
  padding: theme.spacing.medium,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}))
