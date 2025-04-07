import {
  Button,
  Flex,
  GitHubLogoIcon,
  LinkoutIcon,
} from '@pluralsh/design-system'
import { Link } from 'react-router-dom'

import { ComponentPropsWithoutRef } from 'react'
import { PR_QUEUE_ABS_PATH } from 'routes/prRoutesConsts'
import { PrStepKey } from '../CreatePrModal'
import { PullRequestFragment } from 'generated/graphql'

export function CreatePrActions(
  props: ComponentPropsWithoutRef<typeof CreatePrActionsInner>
) {
  return (
    <Flex
      gap="small"
      width="100%"
      justify="space-between"
    >
      <CreatePrActionsInner {...props} />
    </Flex>
  )
}

function CreatePrActionsInner({
  currentStep,
  setCurrentStep,
  allowSubmit,
  successPr,
  loading,
  onClose,
  hasConfiguration,
  configIsValid,
}: {
  currentStep: PrStepKey
  setCurrentStep: (step: PrStepKey) => void
  allowSubmit: boolean
  hasConfiguration: boolean
  configIsValid: boolean
  successPr: Nullable<PullRequestFragment>
  loading: boolean
  onClose: Nullable<() => void>
}) {
  switch (currentStep) {
    case 'success':
      return (
        <>
          <Button
            secondary
            type="button"
            onClick={() => onClose?.()}
          >
            Close
          </Button>
          <Flex gap="small">
            <Button
              secondary
              type="button"
              as={Link}
              to={PR_QUEUE_ABS_PATH}
            >
              View all PRs
            </Button>
            {successPr && (
              <Button
                type="button"
                endIcon={<LinkoutIcon />}
                as="a"
                href={successPr?.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View PR
              </Button>
            )}
          </Flex>
        </>
      )
    case 'review':
      return (
        <>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Flex gap="small">
            {hasConfiguration && (
              <Button
                secondary
                onClick={() => setCurrentStep('config')}
              >
                Back
              </Button>
            )}
            <Button
              loading={loading}
              disabled={!allowSubmit}
              type="submit"
            >
              Create
            </Button>
          </Flex>
        </>
      )
    case 'config':
      return (
        <>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Button
            loading={loading}
            disabled={!configIsValid}
            type="submit"
          >
            Next
          </Button>
        </>
      )
    case 'selectPrAutomation':
      return (
        <>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Flex gap="small">
            <Button
              secondary
              onClick={() => setCurrentStep('selectType')}
            >
              Back
            </Button>
            <Button disabled>Select a PR automation to continue</Button>
          </Flex>
        </>
      )
    case 'preview':
      return (
        <>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Flex gap="small">
            <Button
              secondary
              onClick={() => setCurrentStep('selectType')}
            >
              Back
            </Button>
            <Button
              type="submit"
              startIcon={<GitHubLogoIcon />}
            >
              Create PR
            </Button>
          </Flex>
        </>
      )
    case 'selectType':
    default:
      return (
        <>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Button type="submit">Next step</Button>
        </>
      )
  }
}
