import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import {
  Button,
  Card,
  CloseIcon,
  Flex,
  IconFrame,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { animated, useTransition } from '@react-spring/web'
import { ChatInputSimple } from 'components/ai/chatbot/input/ChatInput'
import { GqlError } from 'components/utils/Alert'
import { Body1P } from 'components/utils/typography/Text'
import { useWorkbenchEvalSkillMutation } from 'generated/graphql'
import { ComponentProps, useCallback, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { WorkbenchStartedJobPanel } from 'components/workbenches/common/WorkbenchStartedJobPanel'

type WorkbenchEvalSkillButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'loading' | 'onClick'
> & {
  evalResultId?: Nullable<string>
  workbenchId: string
}

export function WorkbenchEvalSkillButton({
  evalResultId,
  workbenchId,
  disabled,
  ...props
}: WorkbenchEvalSkillButtonProps) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const lastEvalResultIdRef = useRef<Nullable<string>>(evalResultId ?? null)
  const [open, setOpen] = useState(false)
  const [additionalInformation, setAdditionalInformation] = useState('')
  const [createdJobId, setCreatedJobId] = useState<Nullable<string>>(null)
  const [mutationError, setMutationError] = useState<Nullable<Error>>(null)

  const [workbenchEvalSkill, { loading }] = useWorkbenchEvalSkillMutation({
    onCompleted: ({ workbenchEvalSkill }) => {
      setMutationError(null)
      setCreatedJobId(workbenchEvalSkill?.id ?? null)
    },
    onError: (e) => setMutationError(e),
  })

  const resetState = useCallback(() => {
    setOpen(false)
    setCreatedJobId(null)
    setMutationError(null)
    setAdditionalInformation('')
  }, [])

  const toggle = useCallback(() => {
    if (!open && lastEvalResultIdRef.current !== (evalResultId ?? null)) {
      lastEvalResultIdRef.current = evalResultId ?? null
      setCreatedJobId(null)
      setAdditionalInformation('')
    }

    setOpen((open) => !open)
  }, [evalResultId, open])

  const transitions = useTransition(open ? [true] : [], {
    from: { opacity: 0, scale: 0.65 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.65 },
    config: { tension: 1000, friction: 55 },
  })

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, resetState)

  return (
    <div
      ref={ref}
      css={{ position: 'relative', zIndex: theme.zIndexes.modal }}
    >
      <Button
        disabled={disabled || !evalResultId}
        onClick={toggle}
        {...props}
      >
        Create skills from eval
      </Button>
      {transitions((styles) => (
        <AnimatedWrapperSC style={styles}>
          <WorkbenchEvalSkillPanel
            additionalInformation={additionalInformation}
            createdJobId={createdJobId}
            mutationError={mutationError}
            loading={loading}
            onAdditionalInformationChange={setAdditionalInformation}
            onClose={resetState}
            onSubmit={() => {
              if (!evalResultId || loading) return

              workbenchEvalSkill({
                variables: {
                  id: evalResultId,
                  prompt: additionalInformation.trim() || undefined,
                },
              })
            }}
            workbenchId={workbenchId}
          />
        </AnimatedWrapperSC>
      ))}
    </div>
  )
}

function WorkbenchEvalSkillPanel({
  additionalInformation,
  createdJobId,
  mutationError,
  loading,
  onAdditionalInformationChange,
  onClose,
  onSubmit,
  workbenchId,
}: {
  additionalInformation: string
  createdJobId: Nullable<string>
  mutationError: Nullable<Error>
  loading: boolean
  onAdditionalInformationChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
  workbenchId: string
}) {
  const theme = useTheme()

  return (
    <Card
      fillLevel={1}
      css={{
        border: theme.borders.input,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        padding: theme.spacing.large,
        width: 568,
      }}
    >
      <Flex
        align="center"
        gap="small"
      >
        <WorkbenchIcon color="icon-light" />
        <Body1P
          $color="text-light"
          css={{ flexGrow: 1 }}
        >
          Update workbench skills
        </Body1P>
        <IconFrame
          clickable
          icon={<CloseIcon />}
          onClick={onClose}
          tooltip="Close"
        />
      </Flex>
      <PanelContentSC>
        {mutationError && <GqlError error={mutationError} />}
        {createdJobId ? (
          <WorkbenchStartedJobPanel
            jobId={createdJobId}
            workbenchId={workbenchId}
          />
        ) : (
          <Flex
            direction="column"
            gap="large"
          >
            <ChatInputSimple
              placeholder="Add any additional information"
              setValue={onAdditionalInformationChange}
              initialValue={additionalInformation}
              onSubmit={onSubmit}
              loading={loading}
              allowSubmit={!!workbenchId}
              wrapperStyles={{ minHeight: 140, maxWidth: '100%' }}
            />
          </Flex>
        )}
      </PanelContentSC>
    </Card>
  )
}

const AnimatedWrapperSC = styled(animated.div)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 32 + theme.spacing.medium,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 160px)',
  overflow: 'visible',
  transformOrigin: 'top right',
}))

const PanelContentSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing.large,
  marginTop: theme.spacing.medium,
  minHeight: 0,
  overflow: 'visible',
}))
