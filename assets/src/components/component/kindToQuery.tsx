import {
  CertificateDocument,
  CronJobDocument,
  DeploymentDocument,
  IngressDocument,
  JobDocument,
  ServiceDocument,
  StatefulSetDocument,
} from 'generated/graphql'

export const kindToQuery = {
  certificate: CertificateDocument,
  cronjob: CronJobDocument,
  deployment: DeploymentDocument,
  ingress: IngressDocument,
  job: JobDocument,
  service: ServiceDocument,
  statefulset: StatefulSetDocument,
} as const
