import {
  ArrowTopRightIcon,
  Button,
  CloseIcon,
  Flex,
  IconFrame,
  Markdown,
  SidePanelOpenIcon,
} from '@pluralsh/design-system'
import {
  PanelHeaderSC,
  SidePanelContent,
} from 'components/ai/chatbot/SidePanelShared'
import {
  SidePanel,
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanel'
import {
  ReactNode,
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
} from 'react'

const DEFAULT_TITLE = 'Setup guide'
const SIDE_PANEL_TYPE: SidePanel = 'webhook-setup-guide'

type SetupGuidePanelData = {
  documentationUrl?: string
  markdownPath: string
}

type SetupGuidePanelContextT = {
  isOpen: boolean
  documentationUrl?: string
  markdownPath: Nullable<string>
  openSetupGuidePanel: (panel: SetupGuidePanelData) => void
  closeSetupGuidePanel: () => void
}

const WebhookSetupGuidePanelContext = createContext<SetupGuidePanelContextT>({
  isOpen: false,
  documentationUrl: undefined,
  markdownPath: null,
  openSetupGuidePanel: () =>
    console.error(
      'openSetupGuidePanel must be used within a SetupGuidePanelProvider'
    ),
  closeSetupGuidePanel: () =>
    console.error('setOpen must be used within a SetupGuidePanelProvider'),
})

export function WebhookSetupGuidePanelProvider({
  children,
}: {
  children: ReactNode
}) {
  const { sidePanel, setSidePanel } = useTopLevelSidePanel()
  const [documentationUrl, setDocumentationUrl] = useState<string | undefined>()
  const [markdownPath, setMarkdownPath] = useState<Nullable<string>>(null)

  const isOpen = sidePanel === SIDE_PANEL_TYPE

  const ctx = useMemo(
    () => ({
      isOpen,
      documentationUrl,
      markdownPath,
      openSetupGuidePanel: (panel: SetupGuidePanelData) => {
        setDocumentationUrl(panel.documentationUrl)
        setMarkdownPath(panel.markdownPath)
        setSidePanel(SIDE_PANEL_TYPE)
      },
      closeSetupGuidePanel: () => setSidePanel(null),
    }),
    [isOpen, documentationUrl, markdownPath, setSidePanel]
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

export function WebhookSetupGuidePanelContent() {
  const { isOpen, documentationUrl, markdownPath, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const [markdownText, setMarkdownText] = useState('')
  const [isMarkdownLoading, setIsMarkdownLoading] = useState(false)
  const [markdownError, setMarkdownError] = useState<Nullable<string>>(null)

  useEffect(() => {
    if (!isOpen || !markdownPath) {
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
  }, [isOpen, markdownPath])

  return (
    <SidePanelContent>
      <PanelHeaderSC>
        <Button
          small
          tertiary
          startIcon={
            <SidePanelOpenIcon css={{ transform: 'rotate(180deg)' }} />
          }
          onClick={closeSetupGuidePanel}
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
              as="a"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textTransform: 'none' }}
              href={documentationUrl}
              endIcon={<ArrowTopRightIcon />}
            >
              Open full doc
            </Button>
          )}
          <IconFrame
            clickable
            icon={<CloseIcon />}
            onClick={closeSetupGuidePanel}
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
    </SidePanelContent>
  )
}
