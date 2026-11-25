import { Button, Card, Flex, FormField, Switch } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { useWorkbenchDevboxesQuery } from 'generated/graphql'
import { produce } from 'immer'
import { useEffect, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { DevboxAttachModal } from '../devboxes/DevboxAttachModal'
import { DevboxStatusChip } from '../devboxes/DevboxChips'
import { devboxSizing } from '../devboxes/devboxSizing'
import { useWorkbenchFormPersistence } from './WorkbenchCreateOrEdit'
import type { WorkbenchFormStepProps } from './WorkbenchFormSteps'

export function WorkbenchDevboxesSubStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const { workbenchId, isCreateMode } = useWorkbenchFormPersistence()
  const [attachOpen, setAttachOpen] = useState(false)
  const { data, loading, error } = useWorkbenchDevboxesQuery({
    variables: { id: workbenchId ?? '' },
    skip: !workbenchId || isCreateMode || !!formState.devboxes,
    fetchPolicy: 'network-only',
  })

  // seeds the draft with what's attached now, so saving can diff against it
  useEffect(() => {
    if (formState.devboxes) return
    if (isCreateMode || !workbenchId) {
      setFormState((s) => ({ ...s, devboxes: { initialIds: [], boxes: [] } }))
      return
    }
    const attached = data?.workbench?.devboxes
    if (!attached) return
    const boxes = attached.filter(isNonNullable)
    setFormState((s) => ({
      ...s,
      devboxes: { initialIds: boxes.map(({ id }) => id), boxes },
    }))
  }, [data, formState.devboxes, isCreateMode, setFormState, workbenchId])

  const boxes = formState.devboxes?.boxes ?? []
  const setBoxes = (next: typeof boxes) =>
    setFormState(
      produce((d) => {
        if (d.devboxes) d.devboxes.boxes = next
      })
    )

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <FormField
        label="Devboxes"
        hint="Coding agents in this workbench can start instances on these devboxes"
      >
        <Flex
          direction="column"
          gap="small"
        >
          {error && <GqlError error={error} />}
          {!formState.devboxes && loading ? (
            <RectangleSkeleton
              $height={64}
              $width="100%"
            />
          ) : (
            boxes.map((box) => (
              <Card
                key={box.id}
                css={{ padding: 12 }}
              >
                <Flex
                  justify="space-between"
                  align="center"
                  gap="small"
                >
                  <Flex
                    direction="column"
                    gap="xxsmall"
                  >
                    <Flex
                      gap="xsmall"
                      align="center"
                    >
                      <Body2BoldP>{box.name}</Body2BoldP>
                      <DevboxStatusChip status={box.status} />
                    </Flex>
                    <CaptionP $color="text-xlight">
                      {[devboxSizing(box.resources), box.cluster?.name]
                        .filter(Boolean)
                        .join(' · ')}
                    </CaptionP>
                  </Flex>
                  <Button
                    small
                    tertiary
                    destructive
                    onClick={() =>
                      setBoxes(boxes.filter(({ id }) => id !== box.id))
                    }
                  >
                    Detach
                  </Button>
                </Flex>
              </Card>
            ))
          )}
          <Flex>
            <Button
              small
              secondary
              disabled={!formState.devboxes}
              onClick={() => setAttachOpen(true)}
            >
              Attach devbox
            </Button>
          </Flex>
        </Flex>
      </FormField>
      <FormField label="Billing">
        <Flex
          direction="column"
          gap="small"
        >
          <Switch
            checked={
              formState.configuration?.devbox?.allowSubscriptionCredentials ??
              false
            }
            onChange={(checked) =>
              setFormState(
                produce((d) => {
                  d.configuration = d.configuration ?? {}
                  d.configuration.devbox = d.configuration.devbox ?? {}
                  d.configuration.devbox.allowSubscriptionCredentials = checked
                })
              )
            }
          >
            Allow personal AI subscriptions
          </Switch>
          <CaptionP $color="text-light">
            Lets members bill devbox agents to their own Claude or ChatGPT plan.
            That traffic goes straight to Anthropic or OpenAI, bypassing the
            Plural AI proxy&apos;s audit, budgets and model policy.
          </CaptionP>
        </Flex>
      </FormField>
      <DevboxAttachModal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        attachedIds={boxes.map(({ id }) => id)}
        onAttach={(box) => setBoxes([...boxes, box])}
      />
    </Flex>
  )
}
