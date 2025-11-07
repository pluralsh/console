import {
  Button,
  Modal,
  Sidecar,
  SidecarItem,
  Tooltip,
} from '@pluralsh/design-system'
import {
  SentinelCheckFragment,
  SentinelFragment,
  SentinelRunFragment,
} from 'generated/graphql'

import { RawYaml } from 'components/component/ComponentRaw'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP, InlineA } from 'components/utils/typography/Text'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { deepOmitFalsy } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { formatLocalizedDateTime, fromNow } from '../../../../utils/datetime'
import { getSentinelCheckIcon } from '../SentinelsTableCols'
import { useTheme } from 'styled-components'

export function SentinelDetailsSidecar({
  sentinel,
}: {
  sentinel: Nullable<SentinelFragment>
}) {
  return (
    <ResponsiveLayoutSidecarContainer>
      {!sentinel ? (
        <SidecarSkeleton />
      ) : (
        <Sidecar>
          {sentinel.lastRunAt && (
            <SidecarItem heading="Last run">
              {fromNow(sentinel.lastRunAt)}
            </SidecarItem>
          )}
          {!isEmpty(sentinel.checks) && (
            <SidecarItem heading="Check definitions">
              {sentinel.checks?.filter(isNonNullable).map((check) => (
                <SentinelCheckButton
                  key={`${check.name}-${check.type}`}
                  check={check}
                />
              ))}
            </SidecarItem>
          )}
          {sentinel.repository?.httpsPath && (
            <SidecarItem heading="Source">
              <InlineA href={sentinel.repository.httpsPath}>
                {sentinel.repository.httpsPath}
              </InlineA>
            </SidecarItem>
          )}
          <SidecarItem heading="ID">{sentinel.id}</SidecarItem>
          <SidecarItem heading="Created">
            {formatLocalizedDateTime(sentinel.insertedAt)}
          </SidecarItem>
          <SidecarItem heading="Updated">
            {formatLocalizedDateTime(sentinel.updatedAt)}
          </SidecarItem>
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}

export function SentinelRunSidecar({
  run,
}: {
  run: Nullable<SentinelRunFragment>
}) {
  return (
    <ResponsiveLayoutSidecarContainer>
      {!run ? (
        <SidecarSkeleton />
      ) : (
        <Sidecar>
          {run.insertedAt && (
            <SidecarItem heading="Started">
              {formatLocalizedDateTime(run.insertedAt)}
            </SidecarItem>
          )}
          {run.completedAt && (
            <SidecarItem heading="Completed">
              {formatLocalizedDateTime(run.completedAt)}
            </SidecarItem>
          )}
          {run.sentinel?.repository?.httpsPath && (
            <SidecarItem heading="Source">
              <InlineA href={run.sentinel.repository.httpsPath}>
                {run.sentinel.repository.httpsPath}
              </InlineA>
            </SidecarItem>
          )}
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}

function SentinelCheckButton({ check }: { check: SentinelCheckFragment }) {
  const { spacing } = useTheme()
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <Tooltip
        label={
          <span>
            View config for <b>{check.name}</b> check
          </span>
        }
      >
        <Button
          small
          tertiary
          startIcon={getSentinelCheckIcon(check.type)}
          onClick={() => setShowModal(true)}
          css={{
            width: '100%',
            paddingLeft: spacing.xxsmall,
            justifyContent: 'flex-start',
          }}
          innerFlexProps={{ minWidth: 0 }}
        >
          <CaptionP css={{ ...TRUNCATE }}>{check.name}</CaptionP>
        </Button>
      </Tooltip>
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        actions={<Button onClick={() => setShowModal(false)}>Close</Button>}
        header={`${check.name} check definition`}
      >
        <RawYaml raw={deepOmitFalsy(check)} />
      </Modal>
    </>
  )
}
