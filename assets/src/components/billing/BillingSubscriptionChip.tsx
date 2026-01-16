import { useContext } from 'react'
import {
  Chip,
  ChipProps,
  Flex,
  Tooltip,
  WarningIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'

const Link = styled.a({ textDecoration: 'none' })

export function BillingSubscriptionChip({
  asLink = false,
  ...props
}: { asLink?: boolean } & ChipProps) {
  const { isProPlan, isEnterprisePlan, isLicenseExpiring, licenseExpiry } =
    useContext(SubscriptionContext)

  return (
    <WrapWithIf
      condition={!!asLink}
      wrapper={
        <Link
          href="https://app.plural.sh/account/billing"
          target="_blank"
          rel="noopener noreferrer"
        />
      }
    >
      <WrapWithIf
        condition={isLicenseExpiring}
        wrapper={
          <Tooltip
            placement="top"
            label={
              <span>
                License expires:
                <br />
                <strong>
                  {formatDateTime(licenseExpiry, 'MMM D, YYYY h:mm a')}
                </strong>
              </span>
            }
          />
        }
      >
        <Chip
          severity={isEnterprisePlan || isProPlan ? 'info' : 'neutral'}
          fillLevel={2}
          {...props}
        >
          <Flex
            gap="xsmall"
            align="center"
          >
            {isEnterprisePlan
              ? 'Enterprise'
              : isProPlan
                ? 'Professional'
                : 'Open-source'}
            {isLicenseExpiring && (
              <WarningIcon
                color="icon-warning"
                size={14}
              />
            )}
          </Flex>
        </Chip>
      </WrapWithIf>
    </WrapWithIf>
  )
}
