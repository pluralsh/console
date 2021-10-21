import React from 'react'
import { Briefcase, Clock, Cube, ShareOption } from 'grommet-icons'
import { Certificate, Service, StatefulSet, Deployment } from 'forge-core'

const ICON_SIZE = '14px'

export default function Icon({kind, size}) {
  const iconSize = size || ICON_SIZE
  switch (kind.toLowerCase()) {
    case "service":
      return <Service size={iconSize} />
    case "deployment":
      return <Deployment size={iconSize} />
    case "statefulset":
      return <StatefulSet size={iconSize} />
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