export const DEFAULT_CHART_ICON = '/chart.png'
export const DEFAULT_TF_ICON = '/terraform.png'
export const DEFAULT_DKR_ICON = '/docker.png'
export const DEFAULT_GCP_ICON = '/gcp.png'
export const DEFAULT_AZURE_ICON = '/azure.png'
export const DEFAULT_AWS_ICON = '/aws.png'
export const DEFAULT_EQUINIX_ICON = '/equinix-metal.png'
export const DEFAULT_KIND_ICON = '/kind.png'
export const DARK_AWS_ICON = '/aws-icon.png'
export const MODAL_WIDTH = '50vw'
export const PROVIDER_WIDTH = 50

export const ProviderIcons = {
  GCP: DEFAULT_GCP_ICON,
  AWS: DEFAULT_AWS_ICON,
  AZURE: DEFAULT_AZURE_ICON,
  EQUINIX: DEFAULT_EQUINIX_ICON,
  KIND: DEFAULT_KIND_ICON,
}

export const DarkProviderIcons = {
  AWS: DARK_AWS_ICON,
}

export enum ConfigurationType {
  STRING = 'STRING',
  BOOL = 'BOOL',
  INT = 'INT',
  DOMAIN = 'DOMAIN',
  BUCKET = 'BUCKET',
  PASSWORD = 'PASSWORD',
}

export enum OperationType {
  NOT = 'NOT',
  PREFIX = 'PREFIX',
}
