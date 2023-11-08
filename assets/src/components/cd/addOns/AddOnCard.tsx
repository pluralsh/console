import { AppIcon, Card, GlobeIcon, Tooltip } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

import { ClusterAddOnFragment } from 'generated/graphql'

import { Body1BoldP } from 'components/utils/typography/Text'
import { toNiceVersion } from 'utils/semver'

import { InstallAddOn } from './InstallAddOn'

export const versionName = (vsn: string) =>
  vsn.startsWith('v') ? vsn : `v${vsn}`

const AddOnCardSC = styled(Card)(({ theme }) => ({
  '&&': {
    position: 'relative',
    display: 'flex',
    minWidth: 450,
    padding: theme.spacing.small,
    gap: theme.spacing.small,
    alignItems: 'center',
  },

  '.version': {
    display: 'flex',
    flexAlign: 'center',
  },
  '.content': {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
  },
  '.contentTop': {
    display: 'flex',
    gap: theme.spacing.xsmall,
  },
  '.globalIcon': {
    display: 'flex',
    alignItems: 'center',
  },
}))

export default function AddOnCard({ addOn }: { addOn: ClusterAddOnFragment }) {
  const theme = useTheme()

  if (!addOn) return null

  const { name, global, icon, version } = addOn

  return (
    <AddOnCardSC>
      {icon && (
        <AppIcon
          url={icon}
          size="xsmall"
        />
      )}
      <div className="content">
        <div className="contentTop">
          <Body1BoldP as="h3">{name}</Body1BoldP>
          {global && (
            <div className="globalIcon">
              <Tooltip
                label="Global service"
                placement="top"
              >
                <GlobeIcon
                  size={14}
                  color={theme.colors['icon-light']}
                />
              </Tooltip>
            </div>
          )}
        </div>
        {version && <div className="version">{toNiceVersion(version)}</div>}
      </div>
      <div className="actions">
        <InstallAddOn addOn={addOn} />
      </div>
    </AddOnCardSC>
  )
}
