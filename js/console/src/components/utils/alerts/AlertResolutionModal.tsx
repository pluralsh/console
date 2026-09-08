import {
  Button,
  Card,
  CloseIcon,
  Flex,
  IconFrame,
  Markdown,
  Modal,
  ModalWrapper,
  PencilIcon,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'
import { Key } from '@react-types/shared'
import {
  AlertResolutionFragment,
  useUpsertAlertResolutionMutation,
} from 'generated/graphql'
import { useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { GqlError } from '../Alert'
import { EditableDiv } from '../EditableDiv'
import { Body2P } from '../typography/Text'

export function AlertResolutionModal({
  open,
  onClose,
  initialResolution,
  alertId,
}: {
  open: boolean
  onClose: () => void
  initialResolution?: Nullable<AlertResolutionFragment>
  alertId: string
}) {
  const [isViewOnly, setIsViewOnly] = useState(!!initialResolution)
  const [resolution, setResolution] = useState(initialResolution?.resolution)
  return isViewOnly ? (
    <ViewOnlyModal
      resolution={resolution ?? ''}
      setIsViewOnly={setIsViewOnly}
      open={open}
      onClose={onClose}
    />
  ) : (
    <EditableModal
      alertId={alertId}
      initialResolution={initialResolution?.resolution ?? ''}
      resolution={resolution ?? ''}
      setResolution={setResolution}
      setIsViewOnly={setIsViewOnly}
      open={open}
      onClose={onClose}
    />
  )
}

function ViewOnlyModal({
  resolution,
  setIsViewOnly,
  open,
  onClose,
}: {
  resolution: string
  setIsViewOnly: (isViewOnly: boolean) => void
  open: boolean
  onClose: () => void
}) {
  const { spacing } = useTheme()
  return (
    <ModalWrapper
      open={open}
      onOpenChange={(open) => !open && onClose()}
    >
      <Card
        fillLevel={1}
        width={768}
        css={{ padding: spacing.large, overflow: 'auto' }}
        header={{
          content: (
            <Flex
              justify="space-between"
              width="100%"
              align="center"
            >
              <Flex
                gap="small"
                align="center"
              >
                <span>alert resolution</span>
                <IconFrame
                  clickable
                  tooltip="Edit resolution"
                  icon={<PencilIcon />}
                  onClick={() => setIsViewOnly(false)}
                />
              </Flex>
              <IconFrame
                clickable
                tooltip="Close"
                icon={<CloseIcon />}
                onClick={onClose}
              />
            </Flex>
          ),
        }}
      >
        <Markdown text={resolution ?? ''} />
      </Card>
    </ModalWrapper>
  )
}

function EditableModal({
  alertId,
  initialResolution,
  resolution,
  setResolution,
  setIsViewOnly,
  open,
  onClose,
}: {
  alertId: string
  initialResolution: Nullable<string>
  resolution: string
  setResolution: (resolution: string) => void
  setIsViewOnly: (isViewOnly: boolean) => void
  open: boolean
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<Key>('edit')
  const tabStateRef = useRef<any>(null)

  const [mutation, { loading, error }] = useUpsertAlertResolutionMutation({
    variables: { id: alertId, attributes: { resolution } },
    onCompleted: () => setIsViewOnly(true),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="custom"
      header="mark alert as resolved"
      actions={
        <Flex gap="medium">
          <Button
            secondary
            onClick={() => {
              if (initialResolution) {
                setResolution(initialResolution)
                setIsViewOnly(true)
              }
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            loading={loading}
            disabled={resolution === initialResolution}
            onClick={() => mutation()}
          >
            Submit Resolution
          </Button>
        </Flex>
      }
    >
      <EditModalContentWrapperSC>
        {error && <GqlError error={error} />}
        <Body2P>
          Write a quick explanation for the steps taken to resolve this issue.
          <br />
          The text field below will be rendered as markdown.
        </Body2P>
        <Flex
          direction="column"
          height={436}
        >
          <TabList
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: activeTab,
              onSelectionChange: setActiveTab,
            }}
          >
            <Tab key="edit">Write</Tab>
            <Tab key="preview">Preview</Tab>
          </TabList>
          <TabPanelSC
            stateRef={tabStateRef}
            tabKey={activeTab}
          >
            {activeTab === 'edit' ? (
              <EditableDiv
                placeholder={`# Resolution title\nEnter resolution details`}
                initialValue={resolution}
                setValue={setResolution}
                css={{ height: '100%' }}
              />
            ) : (
              <Markdown text={resolution ?? ''} />
            )}
          </TabPanelSC>
        </Flex>
      </EditModalContentWrapperSC>
    </Modal>
  )
}

const EditModalContentWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  marginTop: -theme.spacing.small,
  gap: theme.spacing.xlarge,
  width: 768,
}))

const TabPanelSC = styled(TabPanel)(({ theme }) => ({
  height: '100%',
  overflow: 'auto',
  background: theme.colors['fill-two'],
  border: theme.borders.input,
  padding: theme.spacing.medium,
  '&:has(div:focus)': { border: theme.borders['outline-focused'] },
  borderRadius: '0px 3px 3px 3px',
}))
