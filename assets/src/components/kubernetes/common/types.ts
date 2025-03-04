import type { OperationVariables } from '@apollo/client/core'

import {
  Types_ListMeta as ListMetaT,
  Types_ObjectMeta as ObjectMetaT,
  Types_TypeMeta as TypeMetaT,
} from '../../../generated/graphql-kubernetes'

interface ErrorStatus {
  code: number
  message: string
  reason: string
  status: string
}

interface Error {
  ErrStatus: ErrorStatus
}

interface DataSelectVariables extends OperationVariables {
  filterBy?: Nullable<string>
  sortBy?: Nullable<string>
  itemsPerPage?: Nullable<string>
  page?: Nullable<string>
}

interface ResourceVariables extends DataSelectVariables {
  namespace?: Nullable<string>
}

interface ResourceList {
  errors: Array<Error>
  listMeta: ListMetaT
}

interface Resource {
  objectMeta: ObjectMetaT
  typeMeta: TypeMetaT
}

type QueryName<TQuery> = Exclude<Extract<keyof TQuery, string>, '__typename'>
type ResourceListItemsKey<TResourceList> = Exclude<
  Extract<keyof TResourceList, string>,
  '__typename' | 'listMeta' | 'errors' | 'status' | 'cumulativeMetrics'
>

enum Kind {
  // Workloads
  Deployment = 'deployment',
  Pod = 'pod',
  ReplicaSet = 'replicaset',
  StatefulSet = 'statefulset',
  DaemonSet = 'daemonset',
  Job = 'job',
  CronJob = 'cronjob',
  ReplicationController = 'replicationcontroller',
  // Discovery
  Service = 'service',
  Ingress = 'ingress',
  IngressClass = 'ingressclass',
  NetworkPolicy = 'networkpolicy',
  // Storage
  PersistentVolumeClaim = 'persistentvolumeclaim',
  PersistentVolume = 'persistentvolume',
  StorageClass = 'storageclass',
  // Configuration
  ConfigMap = 'configmap',
  Secret = 'secret',
  // Access
  Role = 'role',
  RoleBinding = 'rolebinding',
  ClusterRole = 'clusterrole',
  ClusterRoleBinding = 'clusterrolebinding',
  ServiceAccount = 'serviceaccount',
  // Cluster
  Node = 'node',
  Event = 'event',
  Namespace = 'namespace',
  HorizontalPodAutoscaler = 'horizontalpodautoscaler',
  PodDisruptionBudget = 'poddisruptionbudget',
  // CRD
  CustomResourceDefinition = 'customresourcedefinition',
  None = '',
}

interface ObjectReference {
  kind: Kind
  namespace?: Nullable<string>
  name: Nullable<string>
}

interface UnknownProps {
  [key: string]: unknown
}

function toKind(kind: Nullable<string>): Kind {
  if (!kind) {
    return Kind.None
  }

  const result = Object.values(Kind).find((k) => k === kind?.toLowerCase())

  if (result) {
    return result
  }

  throw new Error(`Unknown resource kind: ${kind}`)
}

function fromResource(resource: Resource): ObjectReference {
  return {
    kind: toKind(resource?.typeMeta?.kind?.toLowerCase() ?? ''),
    name: resource?.objectMeta?.name ?? '',
    namespace: resource?.objectMeta?.namespace ?? '',
  }
}

export type {
  Error,
  ResourceVariables,
  ResourceList,
  Resource,
  QueryName,
  ResourceListItemsKey,
  ObjectReference,
  UnknownProps,
}

export { fromResource, toKind, Kind }
