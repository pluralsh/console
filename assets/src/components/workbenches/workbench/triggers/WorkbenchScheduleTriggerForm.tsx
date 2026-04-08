import {
  Button,
  Card,
  Flex,
  FormField,
  Input,
  Input2,
  ReturnIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { Body2P, CaptionP, InlineA } from 'components/utils/typography/Text'
import CronExpressionParser from 'cron-parser'
import cronstrue from 'cronstrue'
import {
  useCreateWorkbenchCronMutation,
  useUpdateWorkbenchCronMutation,
  WorkbenchCronFragment,
} from 'generated/graphql'
import { isEqual, truncate } from 'lodash'
import { useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'
import { SCHEDULE_TRIGGER_REFETCH_QUERIES } from './WorkbenchTriggers'
import { getWorkbenchCronSchedulesAbsPath } from 'routes/workbenchesRoutesConsts'
import { useNavigate } from 'react-router-dom'

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
}: {
  workbenchId: string
  cron?: Nullable<WorkbenchCronFragment>
}) {
  const navigate = useNavigate()
  const theme = useTheme()
  const editing = !!cron

  const [formState, setFormState] = useState<ScheduleTriggerFormState>(() =>
    getInitialFormState(cron)
  )
  const { popToast } = useSimpleToast()

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
      action: editing ? 'updated' : 'created',
      color: 'icon-success',
    })
  }
  const [createWorkbenchCron, createState] = useCreateWorkbenchCronMutation({
    variables: { workbenchId, attributes },
    onCompleted: handleCompleted,
    refetchQueries: SCHEDULE_TRIGGER_REFETCH_QUERIES,
    awaitRefetchQueries: true,
  })
  const [updateWorkbenchCron, updateState] = useUpdateWorkbenchCronMutation({
    variables: { id: cron?.id ?? '', attributes },
    onCompleted: handleCompleted,
    refetchQueries: SCHEDULE_TRIGGER_REFETCH_QUERIES,
    awaitRefetchQueries: true,
  })

  const isSaving = createState.loading || updateState.loading
  const error = createState.error ?? updateState.error

  const handleSave = () => {
    if (!canSave) return
    if (editing && cron) updateWorkbenchCron()
    else createWorkbenchCron()
  }

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
    >
      {error && <GqlError error={error} />}
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
