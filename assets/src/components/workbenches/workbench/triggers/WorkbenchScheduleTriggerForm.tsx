import {
  Button,
  Card,
  Flex,
  FormField,
  InfoOutlineIcon,
  Input,
  Input2,
  ReturnIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { DEFAULT_PAGE_SIZE } from 'components/utils/table/useFetchPaginatedData'
import { Body2P, CaptionP, InlineA } from 'components/utils/typography/Text'
import CronExpressionParser from 'cron-parser'
import cronstrue from 'cronstrue'
import {
  useCreateWorkbenchCronMutation,
  useUpdateWorkbenchCronMutation,
  WorkbenchCronFragment,
  WorkbenchCronsDocument,
  WorkbenchCronsQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime'
import { appendConnectionToEnd, updateCache } from 'utils/graphql'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'

const CRON_SHORTCUTS_URL =
  'https://github.com/harrisiirak/cron-parser?tab=readme-ov-file#predefined-expressions'
const CRON_PLACEHOLDER = '*/5 * * * *'

type ScheduleTriggerFormState = {
  prompt: string
  crontab: string
}

export function WorkbenchScheduleTriggerForm({
  workbenchId,
  cron,
  onCancel,
}: {
  workbenchId: string
  cron?: Nullable<WorkbenchCronFragment>
  onCancel: () => void
}) {
  const theme = useTheme()
  const isEditMode = !!cron

  const [formState, setFormState] = useState<ScheduleTriggerFormState>(() =>
    getInitialFormState(cron)
  )

  useEffect(() => {
    setFormState(getInitialFormState(cron))
  }, [cron])

  const preview = useMemo(
    () => buildCronPreview(formState.crontab),
    [formState.crontab]
  )
  const prompt = formState.prompt.trim()
  const crontab = formState.crontab.trim()
  const isCronValid = !!crontab && validateCronExpression(crontab)
  const hasCronError = !!crontab && !isCronValid
  const [createWorkbenchCron, createState] = useCreateWorkbenchCronMutation({
    update: (cache, { data }) => {
      const createdCron = data?.createWorkbenchCron
      if (!createdCron) return

      updateCache<WorkbenchCronsQuery>(cache, {
        query: WorkbenchCronsDocument,
        variables: { id: workbenchId, first: DEFAULT_PAGE_SIZE },
        update: (prev) => {
          if (!prev.workbench) return prev

          return {
            ...prev,
            workbench: appendConnectionToEnd(
              prev.workbench,
              createdCron,
              'crons'
            ),
          }
        },
      })
    },
    onCompleted: onCancel,
  })
  const [updateWorkbenchCron, updateState] = useUpdateWorkbenchCronMutation({
    update: (cache, { data }) => {
      const updatedCron = data?.updateWorkbenchCron
      if (!updatedCron) return

      updateCache<WorkbenchCronsQuery>(cache, {
        query: WorkbenchCronsDocument,
        variables: { id: workbenchId, first: DEFAULT_PAGE_SIZE },
        update: (prev) => {
          if (!prev.workbench?.crons) return prev

          return {
            ...prev,
            workbench: {
              ...prev.workbench,
              crons: {
                ...prev.workbench.crons,
                edges:
                  prev.workbench.crons.edges?.map((edge) =>
                    edge?.node?.id === updatedCron.id
                      ? { ...edge, node: updatedCron }
                      : edge
                  ) ?? [],
              },
            },
          }
        },
      })
    },
    onCompleted: onCancel,
  })
  const isSaving = createState.loading || updateState.loading
  const error = createState.error ?? updateState.error
  const canSave = !!prompt && isCronValid

  const handleSave = () => {
    if (!canSave || isSaving) return

    const attributes = {
      crontab,
      prompt,
    }

    if (isEditMode && cron) {
      updateWorkbenchCron({ variables: { id: cron.id, attributes } })

      return
    }

    createWorkbenchCron({
      variables: {
        workbenchId,
        attributes,
      },
    })
  }

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      css={{ width: '100%' }}
    >
      {error && <GqlError error={error} />}
      <FormField
        label={
          <>
            Prompt*
            <Tooltip label="The instruction your Workbench agent will follow each time this job runs.">
              <InfoOutlineIcon
                color="icon-light"
                marginLeft="xxsmall"
                size={12}
              />
            </Tooltip>
          </>
        }
      >
        <Input
          multiline
          minRows={3}
          maxRows={6}
          value={formState.prompt}
          onChange={(e) => {
            const prompt = e.target.value

            setFormState((prev) => ({ ...prev, prompt }))
          }}
          placeholder="Ask the agent use an integrated tool or service on your cluster"
        />
      </FormField>
      <Flex
        align="flex-start"
        gap="small"
      >
        <FormField
          error={hasCronError}
          label={
            <>
              Cron expression*
              <Tooltip label="Defines the interval at which your agent will execute the prompt.">
                <InfoOutlineIcon
                  color="icon-light"
                  marginLeft="xxsmall"
                  size={12}
                />
              </Tooltip>
            </>
          }
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
                Enter a cron expression or use shortcuts like @hourly, @daily,
                @weekdays. See all{' '}
                <InlineA href={CRON_SHORTCUTS_URL}>shortcuts</InlineA>.
              </CaptionP>
            )
          }
        >
          <Input2
            value={formState.crontab}
            error={hasCronError}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, crontab: e.target.value }))
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
                      <span css={{ color: theme.colors['code-block-purple'] }}>
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
      <StickyActionsFooterSC>
        <Flex
          gap="small"
          css={{ marginLeft: 'auto' }}
        >
          <Button
            secondary
            startIcon={<ReturnIcon />}
            onClick={onCancel}
            disabled={isSaving}
          >
            Back to all schedules
          </Button>
          <Button
            onClick={handleSave}
            loading={isSaving}
            disabled={!canSave}
          >
            Save
          </Button>
        </Flex>
      </StickyActionsFooterSC>
    </Flex>
  )
}

function validateCronExpression(expression: string) {
  try {
    CronExpressionParser.parse(expression, {
      currentDate: new Date(),
      tz: 'UTC',
    })

    return true
  } catch {
    return false
  }
}

function getInitialFormState(
  cron?: Nullable<WorkbenchCronFragment>
): ScheduleTriggerFormState {
  return {
    prompt: cron?.prompt ?? '',
    crontab: cron?.crontab ?? '',
  }
}

function buildCronPreview(expressionInput: string) {
  const expression = expressionInput.trim() || CRON_PLACEHOLDER

  try {
    const description = cronstrue.toString(expression, {
      throwExceptionOnParseError: true,
    })
    const nextTimes = getNextTriggerTimesUtc(expression, 3)

    return { description, nextTimes }
  } catch {
    return {
      description: 'Invalid cron expression',
      nextTimes: [] as string[],
    }
  }
}

function getNextTriggerTimesUtc(expression: string, count: number): string[] {
  const iterator = CronExpressionParser.parse(expression, {
    currentDate: new Date(),
    tz: 'UTC',
  })

  return Array.from({ length: count }, () => formatCronDateUtc(iterator.next()))
}

function formatCronDateUtc(value: { toISOString: () => string | null }) {
  const iso = value.toISOString()
  if (!iso) return ''
  return dayjs(iso).utc().format('YYYY-MM-DD HH:mm:ss [UTC]')
}

function formatPreviewTimestamp(time: string): Nullable<{
  datePart: string
  hourPart: string
  zonePart: string
}> {
  const parts = time.split(' ')
  if (parts.length !== 3) return null

  const [datePart, hourPart, zonePart] = parts
  if (!datePart || !hourPart || !zonePart) return null

  return { datePart, hourPart, zonePart }
}
