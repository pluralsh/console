import { Check, Deploy, Install, Reload } from 'forge-core'

export const BuildStatus = {
  SUCCESSFUL: 'SUCCESSFUL',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  PENDING: 'PENDING',
}

export const BuildTypes = {
  BOUNCE: 'BOUNCE',
  DEPLOY: 'DEPLOY',
  APPROVAL: 'APPROVAL',
  INSTALL: 'INSTALL',
}

export const BuildIcons = {
  BOUNCE: Reload,
  DEPLOY: Deploy,
  APPROVAL: Check,
  INSTALL: Install,
}
