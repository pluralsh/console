import React from 'react'
import { Resources, Services, ShareOption, VirtualMachine } from 'grommet-icons'

const ICON_SIZE = '14px'

export default function Icon({kind, size}) {
  switch (kind) {
    case "Service":
      return <Services size={size || ICON_SIZE} />
    case "Deployment":
      return <Resources size={size || ICON_SIZE} />
    case "StatefulSet":
      return <VirtualMachine size={size || ICON_SIZE} />
    case "Ingress":
      return <ShareOption size={size || ICON_SIZE} />
    default:
      return null
  }
}