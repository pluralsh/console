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
import { Body2P, CaptionP, InlineA } from 'components/utils/typography/Text'
import CronExpressionParser from 'cron-parser'
import cronstrue from 'cronstrue'
import {
  useCreateWorkbenchCronMutation,
  WorkbenchCronsDocument,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { dayjsExtended as dayjs } from 'utils/datetime'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'
import { useTheme } from 'styled-components'

const CRON_SHORTCUTS_URL =
  'https://github.com/harrisiirak/cron-parser?tab=readme-ov-file#predefined-expressions'
const CRON_PLACEHOLDER = '*/5 * * * *'

type ScheduleTriggerFormState = {
  // active: boolean
  // name: string
  prompt: string
  crontab: string
}

export function WorkbenchScheduleTriggerCreateForm({
  workbenchId,
  onCancel,
}: {
  workbenchId: string
  onCancel: () => void
}) {
  const theme = useTheme()

  const [formState, setFormState] = useState<ScheduleTriggerFormState>({
    // active: true,
    // name: '',
    prompt: '',
    crontab: '',
  })

  const preview = useMemo(
    () => buildCronPreview(formState.crontab),
    [formState.crontab]
  )
  const [createWorkbenchCron, { loading: isSaving, error: createError }] =
    useCreateWorkbenchCronMutation({
      refetchQueries: [
        {
          query: WorkbenchCronsDocument,
          variables: { id: workbenchId, first: 100 },
        },
      ],
      awaitRefetchQueries: true,
      onCompleted: onCancel,
    })
  const canSave = !!formState.crontab.trim() // !!formState.name.trim() && !!formState.crontab.trim()

  const handleSave = () => {
    if (!canSave || isSaving) return

    createWorkbenchCron({
      variables: {
        workbenchId,
        attributes: {
          crontab: formState.crontab.trim(),
          prompt: formState.prompt.trim() || undefined,
        },
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
      {createError && <GqlError error={createError} />}
      {/*<Switch*/}
      {/*  checked={formState.active}*/}
      {/*  onChange={(active) =>*/}
      {/*    setFormState((prev) => ({ ...prev, active: !!active }))*/}
      {/*  }*/}
      {/*>*/}
      {/*  Schedule active*/}
      {/*</Switch>*/}
      {/*<FormField*/}
      {/*  required*/}
      {/*  label="Schedule name"*/}
      {/*>*/}
      {/*  <Input2*/}
      {/*    value={formState.name}*/}
      {/*    onChange={(e) =>*/}
      {/*      setFormState((prev) => ({ ...prev, name: e.target.value }))*/}
      {/*    }*/}
      {/*  />*/}
      {/*</FormField>*/}
      <FormField label="Prompt">
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
          label="Cron expression"
          hint={
            <CaptionP as="span">
              Enter a cron expression or use shortcuts like @hourly, @daily,
              @reboot. See all{' '}
              <InlineA href={CRON_SHORTCUTS_URL}>shortcuts</InlineA>.
            </CaptionP>
          }
        >
          <Input2
            value={formState.crontab}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, crontab: e.target.value }))
            }
            placeholder={CRON_PLACEHOLDER}
            css={{
              color: theme.colors['code-block-purple'],
              '& input': {
                minHeight: 54,
                paddingLeft: 16,
                paddingRight: 16,
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
        <Button
          destructive
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Flex gap="small">
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

function buildCronPreview(expressionInput: string) {
  const expression = expressionInput.trim() || CRON_PLACEHOLDER

  try {
    const description =
      expression === '@reboot'
        ? 'At reboot'
        : cronstrue.toString(expression, { throwExceptionOnParseError: true })
    const nextTimes =
      expression === '@reboot' ? [] : getNextTriggerTimesUtc(expression, 3)

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
