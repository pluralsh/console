import styled, { StyledProps } from 'styled-components'
import { ReactElement } from 'react'

import { ListBox } from '../ListBox'
import { ListBoxItem } from '../ListBoxItem'
import { AppIcon } from '../../index'
import PencilIcon from '../icons/PencilIcon'
import Chip from '../Chip'

import Tooltip from '../Tooltip'

import InfoOutlineIcon from '../icons/InfoOutlineIcon'

import { useNavigation, useStepper } from './hooks'

const Installer = styled(InstallerUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: '200px',
  gap: theme.spacing.small,

  '.text': {
    color: theme.colors.text,
    whiteSpace: 'nowrap',
    ...theme.partials.text.body2Bold,
  },

  '.item-right-content': {
    display: 'flex',
    alignItems: 'center',
  },

  '.chip-content': {
    marginLeft: theme.spacing.xxsmall,
  },
}))

function InstallerUnstyled({ ...props }: StyledProps<unknown>): ReactElement {
  const { onEdit } = useNavigation()
  const { selected: apps } = useStepper()

  return (
    <div {...props}>
      <div className="text">Apps to install ({apps.length}):</div>
      <ListBox
        selectedKey={null}
        onSelectionChange={() => {}}
      >
        {apps.map((app) => (
          <ListBoxItem
            key={app.key}
            label={app.label}
            leftContent={
              <AppIcon
                size="xsmall"
                url={app.imageUrl}
                icon={app.Icon && <app.Icon />}
              />
            }
            rightContent={
              <div className="item-right-content">
                {app.isDependency && (
                  <Chip
                    marginRight="medium"
                    hue="lightest"
                    size="small"
                  >
                    Dependency
                  </Chip>
                )}
                {app.isRequired && (
                  <Chip
                    marginRight="medium"
                    hue="lightest"
                    size="small"
                    gap="medium"
                  >
                    {app.tooltip && (
                      <Tooltip label={app.tooltip}>
                        <InfoOutlineIcon size={14} />
                      </Tooltip>
                    )}
                    <span className="chip-content">Required</span>
                  </Chip>
                )}
                <PencilIcon
                  color="icon-light"
                  onClick={() => onEdit(app)}
                />
              </div>
            }
          />
        ))}
      </ListBox>
    </div>
  )
}

export { Installer }
