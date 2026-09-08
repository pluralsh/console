import { DatabaseIcon, VSphereLogoIcon } from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { ProviderObjectType } from '../CloudObjectsCard.tsx'
import CloudObject from './CloudObject.tsx'

interface VSphereObject {
  name?: string
  moref?: string
}

interface VSphereObjectsProps {
  type: ProviderObjectType
  objects: Array<any>
}

function label(type: ProviderObjectType): string {
  switch (type) {
    case ProviderObjectType.VSphereVM:
      return 'VM'
    case ProviderObjectType.VSphereHost:
      return 'Host'
    case ProviderObjectType.VSphereDatastore:
      return 'Datastore'
    case ProviderObjectType.VSphereNetwork:
      return 'Network'
    default:
      return 'vSphere object'
  }
}

function icon(type: ProviderObjectType): ReactElement {
  switch (type) {
    case ProviderObjectType.VSphereDatastore:
      return <DatabaseIcon />
    default:
      return <VSphereLogoIcon fullColor />
  }
}

function VSphereObjects({
  type,
  objects,
}: VSphereObjectsProps): ReactElement | null {
  const theme = useTheme()

  const objectList = useMemo(
    () =>
      objects.map((item: VSphereObject) => ({
        type: label(type),
        id: item.name ?? item.moref,
        icon: icon(type),
        object: item,
      })),
    [objects, type]
  )

  return objectList.length === 0 ? null : (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {objectList.map(({ type, id, icon, object }, index) => (
        <CloudObject
          key={id ?? index}
          type={type}
          id={id}
          json={JSON.stringify(object, null, 1)}
          icon={icon}
        />
      ))}
    </div>
  )
}

export { VSphereObjects }
