import {
  Button,
  Card,
  EmptyState,
  Flex,
  FormField,
  Input,
  Input2,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P, CaptionP, InlineA } from 'components/utils/typography/Text'
import {
  useCreateWorkbenchCronMutation,
  useGetWorkbenchCronMutation,
  useUpdateWorkbenchCronMutation,
  useWorkbenchQuery,
  WorkbenchCronFragment,
} from 'generated/graphql'
import { isEqual, truncate } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchCronSchedulesAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_CRON_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from '../create-edit/WorkbenchCreateOrEdit'
import {
  buildCronPreview,
  CRON_PLACEHOLDER,
  formatPreviewTimestamp,
  validateCronExpression,
} from './utils'

const CRON_SHORTCUTS_URL =
  'https://github.com/harrisiirak/cron-parser?tab=readme-ov-file#predefined-expressions' // TODO: Use our own docs once we have them.

type CronScheduleFormState = {
  prompt: string
  crontab: string
}

export function CronScheduleForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const cronId = useParams()[WORKBENCHES_CRON_PARAM_ID]
  const [formState, setFormState] = useState<CronScheduleFormState>(
    getInitialFormState()
  )
  const { popToast } = useSimpleToast()

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const [
    fetchCron,
    { data: cronData, loading: cronLoading, error: cronsError },
  ] = useGetWorkbenchCronMutation({
    onCompleted: (data) => {
      const loadedCron = data?.workbenchCron

      if (!loadedCron) return
      setFormState(getInitialFormState(loadedCron))
    },
  })

  useEffect(() => {
    if (mode === 'edit' && !!cronId) fetchCron({ variables: { id: cronId } })
  }, [cronId, fetchCron, mode])

  const cron = mode === 'edit' ? (cronData?.workbenchCron ?? null) : null

  const preview = useMemo(
    () => buildCronPreview(formState.crontab),
    [formState.crontab]
  )

  const prompt = formState.prompt.trim()
  const crontab = formState.crontab.trim()
  const isCronValid = !!crontab && validateCronExpression(crontab)
  const hasCronError = !!crontab && !isCronValid

  const canSave =
    !!prompt && isCronValid && !isEqual(formState, getInitialFormState(cron))
  const attributes = { crontab, prompt }

  const handleCompleted = () => {
    navigate(getWorkbenchCronSchedulesAbsPath(workbenchId))
    popToast({
      name: truncate(prompt, { length: 30 }),
      action: cron ? 'updated' : 'created',
      color: 'icon-success',
    })
  }
  const [createWorkbenchCron, createState] = useCreateWorkbenchCronMutation({
    variables: { workbenchId, attributes },
    onCompleted: handleCompleted,
    refetchQueries: ['WorkbenchCrons', 'WorkbenchTriggersSummary'],
    awaitRefetchQueries: true,
  })
  const [updateWorkbenchCron, updateState] = useUpdateWorkbenchCronMutation({
    variables: { id: cron?.id ?? '', attributes },
    onCompleted: handleCompleted,
    refetchQueries: ['WorkbenchCrons', 'WorkbenchTriggersSummary'],
    awaitRefetchQueries: true,
  })

  const isSaving = createState.loading || updateState.loading
  const mutationError = createState.error ?? updateState.error

  const handleSave = () => {
    if (!canSave) return
    if (cron) updateWorkbenchCron()
    else createWorkbenchCron()
  }

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        {
          label: 'cron schedules',
          url: getWorkbenchCronSchedulesAbsPath(workbenchId),
        },
        { label: mode === 'create' ? 'create' : 'edit' },
      ],
      [mode, workbench, workbenchId]
    )
  )

  if (workbenchError) return <GqlError error={workbenchError} />

  if (cronsError) return <GqlError error={cronsError} />

  if (mode === 'edit' && !cronLoading && !cron)
    return (
      <EmptyState message="Schedule not found">
        <Button
          startIcon={<ReturnIcon />}
          onClick={() =>
            navigate(getWorkbenchCronSchedulesAbsPath(workbenchId))
          }
        >
          Back to all schedules
        </Button>
      </EmptyState>
    )

  const isLoading =
    (!workbenchData && workbenchLoading) ||
    (mode === 'edit' && !cronData && cronLoading)

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <StackedText
        loading={!workbenchData && workbenchLoading}
        first={workbench?.name}
        firstPartialType="subtitle2"
        firstColor="text"
        second={workbench?.description}
        secondPartialType="body2"
        secondColor="text-xlight"
        gap="xxsmall"
      />
      <Flex
        direction="column"
        width="100%"
        css={{ maxWidth: 750 }}
      >
        {isLoading ? (
          <RectangleSkeleton
            $width="100%"
            $height={300}
          />
        ) : (
          <FormCardSC>
            {mutationError && <GqlError error={mutationError} />}
            <Flex
              direction="column"
              gap="large"
              height="100%"
              width="100%"
            >
              <FormField
                required
                infoTooltip="The instruction your Workbench agent will follow each time this job runs."
                label="Prompt"
              >
                <Input
                  multiline
                  minRows={3}
                  maxRows={6}
                  value={formState.prompt}
                  onChange={(e) => {
                    const nextPrompt = e.target.value

                    setFormState((prev) => ({ ...prev, prompt: nextPrompt }))
                  }}
                  placeholder="Provide any task for your workbench to handle.  Well-crafted tasks are concise and specific."
                />
              </FormField>
              <Flex
                align="flex-start"
                gap="small"
              >
                <FormField
                  required
                  error={hasCronError}
                  infoTooltip="Defines the interval at which your agent will execute the prompt."
                  label="Cron expression"
                  hint={
                    hasCronError ? (
                      <CaptionP
                        as="span"
                        $color="text-danger"
                      >
                        Enter a valid cron expression. See all{' '}
                        <InlineA
                          href={CRON_SHORTCUTS_URL}
                          style={{ color: 'inherit' }}
                        >
                          shortcuts
                        </InlineA>
                        .
                      </CaptionP>
                    ) : (
                      <CaptionP as="span">
                        Enter a cron expression or use shortcuts like @hourly,
                        @daily, @weekdays. See all{' '}
                        <InlineA href={CRON_SHORTCUTS_URL}>shortcuts</InlineA>.
                      </CaptionP>
                    )
                  }
                >
                  <Input2
                    value={formState.crontab}
                    error={hasCronError}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        crontab: e.target.value,
                      }))
                    }
                    placeholder={CRON_PLACEHOLDER}
                    css={{
                      color: theme.colors['code-block-purple'],
                      fontFamily: theme.fontFamilies.mono,
                      '&:focus-within': {
                        border: theme.borders['outline-focused'],
                        borderColor: hasCronError
                          ? theme.colors['border-danger']
                          : theme.colors['code-block-purple'],
                      },
                      '& input': {
                        minHeight: 54,
                        paddingLeft: 16,
                        paddingRight: 16,
                        fontFamily: theme.fontFamilies.mono,
                      },
                    }}
                  />
                </FormField>
                <FormField
                  label="Preview"
                  css={{ minWidth: 350 }}
                >
                  <Card
                    fillLevel={3}
                    css={{
                      padding: theme.spacing.medium,
                      border: 'none',
                      '& p': { lineHeight: '20px' },
                    }}
                  >
                    <Body2P>{preview.description}</Body2P>
                    {preview.nextTimes.map((time, index) => {
                      const parsedTime = formatPreviewTimestamp(time)

                      return (
                        <Body2P key={time}>
                          <span css={{ color: theme.colors['text-xlight'] }}>
                            {index === 0 ? 'next at' : 'then at'}{' '}
                          </span>
                          {parsedTime ? (
                            <>
                              {parsedTime.datePart}{' '}
                              <span
                                css={{
                                  color: theme.colors['code-block-purple'],
                                }}
                              >
                                {parsedTime.hourPart}
                              </span>{' '}
                              {parsedTime.zonePart}
                            </>
                          ) : (
                            time
                          )}
                        </Body2P>
                      )
                    })}
                  </Card>
                </FormField>
              </Flex>
              <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
                <Button
                  secondary
                  startIcon={<ReturnIcon />}
                  onClick={() =>
                    navigate(getWorkbenchCronSchedulesAbsPath(workbenchId))
                  }
                  disabled={isSaving}
                >
                  Back to all schedules
                </Button>
                <Button
                  onClick={() => handleSave()}
                  loading={isSaving}
                  disabled={!canSave}
                >
                  Save
                </Button>
              </StickyActionsFooterSC>
            </Flex>
          </FormCardSC>
        )}
      </Flex>
    </Flex>
  )
}

function getInitialFormState(
  cron?: Nullable<WorkbenchCronFragment>
): CronScheduleFormState {
  return {
    prompt: cron?.prompt ?? '',
    crontab: cron?.crontab ?? '',
  }
}
