import { AppIcon, Chip } from '@pluralsh/design-system'
import React from 'react'
import { useTheme } from 'styled-components'
import { useNavigate, useParams } from 'react-router-dom'

import { TRUNCATE } from '../../../utils/truncate'
import { RuntimeServiceFragment } from '../../../../generated/graphql'
import {
  CLUSTER_PARAM_ID,
  getClusterAddOnDetailsPath,
} from '../../../../routes/cdRoutesConsts'

export default function ClusterAddOnEntry({
  addon,
  active,
  last,
}: {
  addon: RuntimeServiceFragment
  active: boolean
  last: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const params = useParams()
  const clusterId = params[CLUSTER_PARAM_ID] as string

  return (
    <div
      onClick={() => {
        if (!active)
          navigate(
            getClusterAddOnDetailsPath({
              clusterId,
              addOnId: addon.id,
            })
          )
      }}
      css={{
        padding: theme.spacing.medium,
        ...(active
          ? {
              backgroundColor: theme.colors['fill-zero-selected'],
              borderBottom: `2px solid ${theme.colors['border-primary']}`,
              cursor: 'default',
            }
          : {
              borderBottom: last ? undefined : theme.borders.default,
              cursor: 'pointer',

              '&:hover': {
                backgroundColor: theme.colors['fill-zero-hover'],
              },
            }),
      }}
    >
      <div
        css={{
          alignItems: 'center',
          display: 'flex',
          gap: theme.spacing.small,
        }}
      >
        {addon?.addon?.icon ? (
          <AppIcon
            url={addon?.addon.icon}
            size="xxsmall"
            css={{
              backgroundColor: theme.colors['fill-two'],
              border: theme.borders['fill-two'],
              img: { objectFit: 'contain' },
            }}
          />
        ) : undefined}

        <div
          css={{
            ...TRUNCATE,
            ...(active
              ? theme.partials.text.body1Bold
              : theme.partials.text.body1),
            color: active ? theme.colors.text : theme.colors['text-light'],
            flexGrow: 1,
          }}
        >
          {addon.name}
        </div>
        {addon.addonVersion?.blocking === true && (
          <Chip
            size="small"
            severity="danger"
            css={
              active
                ? undefined
                : {
                    '.children': {
                      color: theme.colors['text-xlight'],
                    },
                  }
            }
          >
            Blocking
          </Chip>
        )}
      </div>
    </div>
  )
}
