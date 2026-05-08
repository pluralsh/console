import {
  Button,
  CodeEditor,
  EmptyState,
  Flex,
  FormField,
  Switch,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CaptionP } from 'components/utils/typography/Text'
import {
  WorkbenchEvalAttributes,
  useCreateWorkbenchEvalMutation,
  useDeleteWorkbenchEvalMutation,
  useUpdateWorkbenchEvalMutation,
  useWorkbenchEvalSettingsQuery,
  useWorkbenchQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  WORKBENCH_PARAM_ID,
  getWorkbenchAbsPath,
} from 'routes/workbenchesRoutesConsts'
import { StackedText } from 'components/utils/table/StackedText'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  FormCardSC,
  SidebarBtnSC,
  StickyActionsFooterSC,
  WorkbenchSplitLayoutSC,
} from '../create-edit/WorkbenchCreateOrEdit'

const EVAL_SETTINGS_STEPS = [
  'Prompt quality',
  'Conclusion rules',
  'Progress thought rules',
] as const

type EvalSettingsStep = (typeof EVAL_SETTINGS_STEPS)[number]

export function WorkbenchEvalSettings() {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [curStep, setCurStep] = useState<EvalSettingsStep>('Prompt quality')
  const [evalsEnabled, setEvalsEnabled] = useState(true)
  const [promptQualityRules, setPromptQualityRules] = useState('')
  const [conclusionRules, setConclusionRules] = useState('')
  const [progressAndThoughtsRules, setProgressAndThoughtsRules] = useState('')
  const [isEvalStateInitialized, setIsEvalStateInitialized] = useState(false)
  const curStepIndex = EVAL_SETTINGS_STEPS.findIndex((step) => step === curStep)
  const isLastStep = curStepIndex === EVAL_SETTINGS_STEPS.length - 1

  const {
    data: evalData,
    loading: evalLoading,
    error: evalError,
  } = useWorkbenchEvalSettingsQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })

  const { data, loading, error } = useWorkbenchQuery({
    variables: { id: workbenchId },
    fetchPolicy: 'cache-and-network',
    skip: !workbenchId,
  })
  const workbench = data?.workbench
  const workbenchEval = evalData?.workbench?.eval
  const formLoading =
    (!data && loading) || (!evalData && evalLoading) || !isEvalStateInitialized

  useEffect(() => {
    if (evalLoading || isEvalStateInitialized) return
    setEvalsEnabled(!!workbenchEval)
    setPromptQualityRules(workbenchEval?.promptRules ?? '')
    setConclusionRules(workbenchEval?.conclusionRules ?? '')
    setProgressAndThoughtsRules(workbenchEval?.progressRules ?? '')
    setIsEvalStateInitialized(true)
  }, [evalLoading, isEvalStateInitialized, workbenchEval])

  const [createWorkbenchEval, { loading: createLoading, error: createError }] =
    useCreateWorkbenchEvalMutation()

  const [updateWorkbenchEval, { loading: updateLoading, error: updateError }] =
    useUpdateWorkbenchEvalMutation()

  const [deleteWorkbenchEval, { loading: deleteLoading, error: deleteError }] =
    useDeleteWorkbenchEvalMutation()

  const saveError = createError ?? updateError ?? deleteError
  const saveLoading = createLoading || updateLoading || deleteLoading

  useSetBreadcrumbs(
    useMemo(
      () => [...getWorkbenchBreadcrumbs(workbench), { label: 'eval settings' }],
      [workbench]
    )
  )

  if (!workbenchId || error?.message?.includes('could not find resource')) {
    return <EmptyState message="Workbench not found." />
  }

  if (evalError) return <GqlError error={evalError} />
  if (error) return <GqlError error={error} />

  const handleSave = async () => {
    if (!workbenchId) return

    try {
      if (!evalsEnabled) {
        if (workbenchEval?.id) {
          await deleteWorkbenchEval({
            variables: { id: workbenchEval.id },
            refetchQueries: ['WorkbenchEvalSettings', 'Workbench'],
            awaitRefetchQueries: true,
          })
        }
      } else {
        const attributes: WorkbenchEvalAttributes = {
          promptRules: promptQualityRules || null,
          conclusionRules: conclusionRules || null,
          progressRules: progressAndThoughtsRules || null,
        }

        if (workbenchEval?.id) {
          await updateWorkbenchEval({
            variables: { id: workbenchEval.id, attributes },
            refetchQueries: ['WorkbenchEvalSettings', 'Workbench'],
            awaitRefetchQueries: true,
          })
        } else {
          await createWorkbenchEval({
            variables: { workbenchId, attributes },
            refetchQueries: ['WorkbenchEvalSettings', 'Workbench'],
            awaitRefetchQueries: true,
          })
        }
      }

      popToast({ content: 'Eval settings updated', severity: 'success' })
      navigate(getWorkbenchAbsPath(workbenchId))
    } catch (e) {
      popToast({
        content:
          e instanceof Error
            ? e.message
            : 'Unable to save eval settings. Please try again.',
        severity: 'danger',
      })
    }
  }

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <Flex
        direction="column"
        gap="large"
        width="100%"
        css={{ maxWidth: 968, marginInline: 'auto' }}
      >
        <StackedText
          loading={!data && loading}
          first={workbench?.name}
          firstPartialType="subtitle2"
          firstColor="text"
          second={workbench?.description}
          secondPartialType="body2"
          secondColor="text-xlight"
          gap="xxsmall"
        />
        <WorkbenchSplitLayoutSC css={{ minWidth: 0 }}>
          <Flex
            direction="column"
            width={200}
            flexShrink={0}
            gap="xxxsmall"
          >
            {EVAL_SETTINGS_STEPS.map((step) => (
              <SidebarBtnSC
                key={step}
                $active={step === curStep}
                onClick={() => setCurStep(step)}
              >
                {step}
              </SidebarBtnSC>
            ))}
          </Flex>
          {formLoading ? (
            <RectangleSkeleton
              $width="100%"
              $height="100%"
            />
          ) : (
            <FormCardSC>
              {saveError && <GqlError error={saveError} />}
              {curStep === 'Prompt quality' && (
                <Flex
                  direction="column"
                  gap="large"
                >
                  <Switch
                    checked={evalsEnabled}
                    onChange={(checked) => setEvalsEnabled(checked)}
                  >
                    Turn on evals for {workbench?.name ?? 'workbench-name'}
                  </Switch>
                  <FormField label="Prompt quality rules">
                    <CodeEditor
                      value={promptQualityRules}
                      onChange={(value) => setPromptQualityRules(value ?? '')}
                      language="markdown"
                      height={320}
                      disabled={!evalsEnabled}
                      options={{
                        readOnly: !evalsEnabled,
                        wordWrap: 'on',
                        minimap: { enabled: false },
                      }}
                    />
                  </FormField>
                </Flex>
              )}
              {curStep === 'Conclusion rules' && (
                <FormField label="Conclusion rules">
                  <CodeEditor
                    value={conclusionRules}
                    onChange={(value) => setConclusionRules(value ?? '')}
                    language="markdown"
                    height={320}
                    disabled={!evalsEnabled}
                    options={{
                      readOnly: !evalsEnabled,
                      wordWrap: 'on',
                      minimap: { enabled: false },
                    }}
                  />
                </FormField>
              )}
              {curStep === 'Progress thought rules' && (
                <FormField label="Progress and thoughts rules">
                  <CodeEditor
                    value={progressAndThoughtsRules}
                    onChange={(value) =>
                      setProgressAndThoughtsRules(value ?? '')
                    }
                    language="markdown"
                    height={320}
                    disabled={!evalsEnabled}
                    options={{
                      readOnly: !evalsEnabled,
                      wordWrap: 'on',
                      minimap: { enabled: false },
                    }}
                  />
                </FormField>
              )}
              <StickyActionsFooterSC>
                <Flex
                  align="center"
                  justify="space-between"
                  width="100%"
                  gap="medium"
                >
                  <CaptionP
                    $color="text-xlight"
                    css={{ margin: 0, maxWidth: 320 }}
                  >
                    Evals are generated daily at midnight. Leave any section
                    blank to use the default heuristic.
                  </CaptionP>
                  <Flex gap="small">
                    <Button
                      secondary
                      onClick={() => {
                        setEvalsEnabled(true)
                        setPromptQualityRules('')
                        setConclusionRules('')
                        setProgressAndThoughtsRules('')
                      }}
                    >
                      Reset to default
                    </Button>
                    {isLastStep ? (
                      <Button
                        loading={saveLoading}
                        onClick={() => void handleSave()}
                      >
                        {workbenchEval?.id ? 'Save eval' : 'Create new eval'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() =>
                          setCurStep(EVAL_SETTINGS_STEPS[curStepIndex + 1])
                        }
                      >
                        Next
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </StickyActionsFooterSC>
            </FormCardSC>
          )}
        </WorkbenchSplitLayoutSC>
      </Flex>
    </Flex>
  )
}
