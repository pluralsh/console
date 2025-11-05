import {
  Button,
  Flex,
  GitPullIcon,
  IconFrame,
  Sidecar,
  StackIcon,
} from '@pluralsh/design-system'
import { ServiceStatusChip } from 'components/cd/services/ServiceStatusChip'
import StackStatusChip from 'components/stacks/common/StackStatusChip'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import { InfraResearchFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { Fragment } from 'react/jsx-runtime'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ActionItemHeaderSC,
  ActionItemSC,
} from '../chatbot/actions-panel/ChatbotActionsPanel'

export function InfraResearchSidecar({
  infraResearch,
  loading,
}: {
  infraResearch: Nullable<InfraResearchFragment>
  loading: boolean
}) {
  if (!infraResearch?.associations) return loading ? <SidecarSkeleton /> : null

  return (
    <Sidecar css={{ padding: 0 }}>
      {infraResearch.associations
        .filter(isNonNullable)
        .map(({ id, stack, service }) => (
          <Fragment key={id}>
            {stack && (
              <ActionItemSC>
                <ActionItemHeaderSC>
                  <IconFrame
                    icon={<StackIcon />}
                    size="small"
                  />
                  Stack
                  <Flex
                    flex={1}
                    justifyContent="flex-end"
                  >
                    <StackStatusChip
                      status={stack.status}
                      deleting={!!stack.deletedAt}
                      size="small"
                    />
                  </Flex>
                </ActionItemHeaderSC>
                <CaptionP $color="text-xlight">{stack.name}</CaptionP>
                <Flex justifyContent="flex-end">
                  <Button
                    small
                    as={Link}
                    to={getStacksAbsPath(stack.id)}
                  >
                    View stack
                  </Button>
                </Flex>
              </ActionItemSC>
            )}
            {service && (
              <ActionItemSC>
                <ActionItemHeaderSC>
                  <IconFrame
                    icon={<GitPullIcon />}
                    size="small"
                  />
                  Service
                  <Flex
                    flex={1}
                    justifyContent="flex-end"
                  >
                    <ServiceStatusChip
                      status={service.status}
                      componentStatus={service.componentStatus}
                      size="small"
                    />
                  </Flex>
                </ActionItemHeaderSC>
                <CaptionP $color="text-xlight">{service.name}</CaptionP>
                <Flex justifyContent="flex-end">
                  <Button
                    small
                    as={Link}
                    to={getServiceDetailsPath({
                      serviceId: service?.id,
                      clusterId: service?.cluster?.id,
                    })}
                  >
                    View service
                  </Button>
                </Flex>
              </ActionItemSC>
            )}
          </Fragment>
        ))}
    </Sidecar>
  )
}
