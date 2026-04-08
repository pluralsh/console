import {
  Accordion,
  AccordionItem,
  ArrowTopRightIcon,
  Button,
  CloseIcon,
  Flex,
  IconFrame,
  Markdown,
  SidePanelOpenIcon,
} from '@pluralsh/design-system'
import { CHATBOT_HEADER_HEIGHT } from 'components/ai/chatbot/Chatbot'
import { useResizablePane } from 'components/ai/chatbot/useResizeableChatPane'
import {
  ReactNode,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import styled from 'styled-components'

const DEFAULT_TITLE = 'Setup guide'
const MIN_WIDTH = 500
const MAX_WIDTH_VW = 40
const HANDLE_THICKNESS = 20

type SetupGuidePanelData = {
  documentationUrl?: string
  markdownPath: string
}

type SetupGuidePanelContextT = {
  open: boolean
  documentationUrl?: string
  markdownPath: Nullable<string>
  openSetupGuidePanel: (panel: SetupGuidePanelData) => void
  setOpen: (open: boolean) => void
}

const WebhookSetupGuidePanelContext = createContext<SetupGuidePanelContextT>({
  open: false,
  documentationUrl: undefined,
  markdownPath: null,
  openSetupGuidePanel: () =>
    console.error(
      'openSetupGuidePanel must be used within a SetupGuidePanelProvider'
    ),
  setOpen: () =>
    console.error('setOpen must be used within a SetupGuidePanelProvider'),
})

export function WebhookSetupGuidePanelProvider({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [documentationUrl, setDocumentationUrl] = useState<string | undefined>()
  const [markdownPath, setMarkdownPath] = useState<Nullable<string>>(null)

  const openSetupGuidePanel = useCallback((panel: SetupGuidePanelData) => {
    setDocumentationUrl(panel.documentationUrl)
    setMarkdownPath(panel.markdownPath)
    setOpen(true)
  }, [])

  const ctx = useMemo(
    () => ({
      open,
      documentationUrl,
      markdownPath,
      openSetupGuidePanel,
      setOpen,
    }),
    [open, documentationUrl, markdownPath, openSetupGuidePanel, setOpen]
  )

  return (
    <WebhookSetupGuidePanelContext value={ctx}>
      {children}
    </WebhookSetupGuidePanelContext>
  )
}

export function useWebhookSetupGuidePanel() {
  return use(WebhookSetupGuidePanelContext)
}

export function WebhookSetupGuidePanel() {
  const { open, documentationUrl, markdownPath, setOpen } =
    useWebhookSetupGuidePanel()
  const { calculatedPanelWidth, dragHandleProps, isDragging } =
    useResizablePane(MIN_WIDTH, MAX_WIDTH_VW)
  const [markdownText, setMarkdownText] = useState('')
  const [isMarkdownLoading, setIsMarkdownLoading] = useState(false)
  const [markdownError, setMarkdownError] = useState<Nullable<string>>(null)

  useEffect(() => {
    if (!open || !markdownPath) {
      setMarkdownText('')
      setMarkdownError(null)
      setIsMarkdownLoading(false)
      return
    }

    const controller = new AbortController()
    setIsMarkdownLoading(true)
    setMarkdownError(null)

    fetch(markdownPath, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load setup guide markdown (${response.status})`
          )
        }

        return response.text()
      })
      .then((text) => setMarkdownText(text))
      .catch((error: { name?: string }) => {
        if (error?.name === 'AbortError') return

        setMarkdownError('Failed to load setup guide content.')
      })
      .finally(() => setIsMarkdownLoading(false))

    return () => controller.abort()
  }, [open, markdownPath])

  return (
    <Accordion
      type="single"
      value={`${open}`}
      orientation="horizontal"
      css={{ border: 'none', zIndex: 1 }}
    >
      <AccordionItem
        value={`${true}`}
        caret="none"
        padding="none"
        trigger={null}
        css={{ height: '100%' }}
      >
        <div
          css={{ position: 'relative', height: '100%' }}
          style={
            {
              '--setup-guide-panel-width': `${calculatedPanelWidth}px`,
            } as React.CSSProperties
          }
        >
          <PanelWrapperSC>
            <PanelHeaderSC>
              <Button
                small
                tertiary
                startIcon={
                  <SidePanelOpenIcon css={{ transform: 'rotate(180deg)' }} />
                }
                onClick={() => setOpen(false)}
              >
                {DEFAULT_TITLE}
              </Button>
              <Flex
                align="center"
                gap="xsmall"
              >
                {documentationUrl && (
                  <Button
                    small
                    tertiary
                    endIcon={<ArrowTopRightIcon />}
                    onClick={() =>
                      window.open(
                        documentationUrl,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  >
                    Open full doc
                  </Button>
                )}
                <IconFrame
                  clickable
                  icon={<CloseIcon />}
                  onClick={() => setOpen(false)}
                  tooltip="Close panel"
                />
              </Flex>
            </PanelHeaderSC>
            <Flex
              direction="column"
              minHeight={0}
              overflow="auto"
              padding="medium"
              color="text"
            >
              {isMarkdownLoading ? (
                'Loading setup guide...'
              ) : markdownError ? (
                markdownError
              ) : (
                <Markdown text={markdownText} />
              )}
            </Flex>
          </PanelWrapperSC>
          <DragHandleSC
            tabIndex={0}
            {...dragHandleProps}
            $isDragging={isDragging}
          />
        </div>
      </AccordionItem>
    </Accordion>
  )
}

const PanelWrapperSC = styled.div(({ theme }) => ({
  position: 'relative',
  zIndex: theme.zIndexes.modal,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: 'var(--setup-guide-panel-width)',
  borderLeft: theme.borders.default,
  background: theme.colors['fill-accent'],
}))

const PanelHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: CHATBOT_HEADER_HEIGHT,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders.default,
  flexShrink: 0,
}))

const DragHandleSC = styled.div<{ $isDragging: boolean }>(
  ({ theme, $isDragging }) => ({
    position: 'absolute',
    zIndex: theme.zIndexes.modal,
    left: -HANDLE_THICKNESS / 2,
    top: 0,
    width: HANDLE_THICKNESS,
    height: '100%',
    cursor: 'ew-resize',
    background: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
    '&::before': {
      content: '""',
      pointerEvents: 'none',
      width: HANDLE_THICKNESS / 4,
      background: $isDragging ? theme.colors['icon-primary'] : 'transparent',
      transition: 'background 0.2s ease-in-out',
    },
  })
)
