import { Cycle, Install, Validate } from "grommet-icons"
import { Builds } from 'forge-core'

export const BuildStatus = {
  SUCCESSFUL: 'SUCCESSFUL',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  PENDING: 'PENDING'
}

export const BuildTypes = {
  BOUNCE: 'BOUNCE',
  DEPLOY: 'DEPLOY',
  APPROVAL: 'APPROVAL',
  INSTALL: 'INSTALL'
}

export const BuildIcons = {
  BOUNCE: Cycle,
  DEPLOY: Builds,
  APPROVAL: Validate,
  INSTALL: Install,
}