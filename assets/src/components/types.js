import { Install } from "grommet-icons"
import { Builds, Reload, Check } from 'forge-core'

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
  BOUNCE: Reload,
  DEPLOY: Builds,
  APPROVAL: Check,
  INSTALL: Install,
}