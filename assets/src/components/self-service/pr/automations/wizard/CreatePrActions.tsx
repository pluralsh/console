import {
  Button,
  Flex,
  GitHubLogoIcon,
  LinkoutIcon,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { Link } from 'react-router-dom'

import { ComponentPropsWithoutRef } from 'react'
import { PR_OUTSTANDING_ABS_PATH } from 'routes/selfServiceRoutesConsts'
import { PrStepKey } from '../CreatePrModal'
import { PullRequestFragment } from 'generated/graphql'
import { PrConfigPageData } from '../prConfigurationUtils'

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
  isScalingRec = false,
  pageData,
}: {
  currentStep: PrStepKey
  setCurrentStep: (step: PrStepKey) => void
  allowSubmit: boolean
  hasConfiguration: boolean
  configIsValid: boolean
  successPr: Nullable<PullRequestFragment>
  loading: boolean
  onClose: Nullable<() => void>
  isScalingRec?: boolean
  pageData: PrConfigPageData
}) {
  const { goToPage, curPage, pages } = pageData
  const curPageIndex = pages.indexOf(curPage)
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
              to={PR_OUTSTANDING_ABS_PATH}
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
            type="button"
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Flex gap="small">
            {hasConfiguration && (
              <Button
                secondary
                type="button"
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
            type="button"
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Flex gap="small">
            {(isScalingRec || curPageIndex > 0) && (
              <Button
                secondary
                type="button"
                onClick={() => {
                  if (curPageIndex > 0) goToPage(pages[curPageIndex - 1])
                  else setCurrentStep('selectPrAutomation')
                }}
              >
                Back
              </Button>
            )}
            {curPageIndex < pages.length - 1 ? (
              <Button
                type="button"
                onClick={() => goToPage(pages[curPageIndex + 1])}
              >
                Next page
              </Button>
            ) : (
              <WrapWithIf
                condition={!configIsValid}
                wrapper={
                  <Tooltip
                    placement="top"
                    label="Please fill out all required fields"
                  />
                }
              >
                {/* wrapper div needed for tooltip when button is disabled */}
                <div>
                  <Button
                    loading={loading}
                    disabled={!configIsValid}
                    type="submit"
                  >
                    Review
                  </Button>
                </div>
              </WrapWithIf>
            )}
          </Flex>
        </>
      )
    case 'selectPrAutomation':
      return (
        <>
          <Button
            secondary
            type="button"
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Flex gap="small">
            <Button
              secondary
              type="button"
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
            type="button"
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Flex gap="small">
            <Button
              secondary
              type="button"
              onClick={() => setCurrentStep('selectType')}
            >
              Back
            </Button>
            <Button
              type="submit"
              startIcon={<GitHubLogoIcon />}
              loading={loading}
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
            type="button"
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Button type="submit">Next step</Button>
        </>
      )
  }
}
