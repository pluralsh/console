import React from 'react'
import { Briefcase, Certificate, Clock, Cube, Resources, Services, ShareOption, VirtualMachine } from 'grommet-icons'

const ICON_SIZE = '14px'

export default function Icon({kind, size}) {
  const iconSize = size || ICON_SIZE
  switch (kind.toLowerCase()) {
    case "service":
      return <Services size={iconSize} />
    case "deployment":
      return <Resources size={iconSize} />
    case "statefulset":
      return <VirtualMachine size={iconSize} />
    case "ingress":
      return <ShareOption size={iconSize} />
    case "cronjob":
      return <Clock size={iconSize} />
    case 'pod':
      return <Cube size={iconSize} />
    case 'job':
      return <Briefcase size={iconSize} />
    case "certificate":
      return <Certificate size={iconSize} />
    default:
      return null
  }
}