import React from 'react'
import { Clock, Resources, Services, ShareOption, VirtualMachine } from 'grommet-icons'

const ICON_SIZE = '14px'

export default function Icon({kind, size}) {
  switch (kind.toLowerCase()) {
    case "service":
      return <Services size={size || ICON_SIZE} />
    case "deployment":
      return <Resources size={size || ICON_SIZE} />
    case "statefulset":
      return <VirtualMachine size={size || ICON_SIZE} />
    case "ingress":
      return <ShareOption size={size || ICON_SIZE} />
    case "cronjob":
      return <Clock size={size || ICON_SIZE} />
    default:
      return null
  }
}