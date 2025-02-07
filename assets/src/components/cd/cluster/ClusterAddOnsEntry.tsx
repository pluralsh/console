import { AppIcon, Chip } from '@pluralsh/design-system'
import { useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  CLUSTER_PARAM_ID,
  getClusterAddOnDetailsPath,
} from '../../../routes/cdRoutesConsts'

import { TRUNCATE } from '../../utils/truncate'

export default function ClusterAddOnsEntry({
  id,
  name,
  icon,
  blocking,
  active,
  cloudAddon,
}: {
  id: string
  name: string
  icon?: string | null
  blocking?: boolean | null
  active: boolean
  cloudAddon: boolean
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
              addOnId: id,
              isCloudAddon: cloudAddon,
            })
          )
      }}
      css={{
        padding: theme.spacing.medium,
        borderLeft: theme.borders.default,
        borderRight: theme.borders.default,

        ...(active
          ? {
              backgroundColor: theme.colors['fill-zero-selected'],
              borderBottom: `2px solid ${theme.colors['border-primary']}`,
              cursor: 'default',
            }
          : {
              borderBottom: theme.borders.default,
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
        {icon ? (
          <AppIcon
            url={icon}
            size="xxsmall"
            css={{
              backgroundColor: active
                ? theme.colors['fill-three']
                : theme.colors['fill-two'],
              border: active
                ? theme.borders['fill-three']
                : theme.borders['fill-two'],
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
          {name}
        </div>
        {blocking && (
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
