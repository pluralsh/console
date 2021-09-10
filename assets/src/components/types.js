import { Cycle, Deploy, Install, Validate } from "grommet-icons"

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
  DEPLOY: Deploy,
  APPROVAL: Validate,
  INSTALL: Install,
}