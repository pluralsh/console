{{/* ate-setup's postgres-size10 profile. */}}
{{- define "substrate.cnpg.presets" -}}
size10:
  resources:
    requests:
      cpu: "80"
      memory: 140Gi
    limits:
      memory: 140Gi
  parameters:
    shared_buffers: 35GB
    effective_cache_size: 100GB
    work_mem: 32MB
    maintenance_work_mem: 2GB
    wal_buffers: 64MB
    huge_pages: try
    max_connections: "500"
    max_wal_size: 16GB
    min_wal_size: 4GB
    checkpoint_completion_target: "0.9"
    wal_compression: "on"
    max_worker_processes: "88"
    max_parallel_workers: "64"
    max_parallel_workers_per_gather: "4"
    max_parallel_maintenance_workers: "6"
    random_page_cost: "1.1"
    effective_io_concurrency: "200"
    autovacuum_max_workers: "6"
    autovacuum_naptime: 10s
{{- end -}}

{{/*
pkg/postgressetup/setup.sql for a fresh CNPG database: initdb has created the
owner login; this adds the NOLOGIN roles, the schema and its grants. The
read-write login comes from managed.roles.
*/}}
{{- define "substrate.cnpg.setupSQL" -}}
{{- $pg := .Values.postgres -}}
- CREATE ROLE {{ $pg.ownerRole }} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
- CREATE ROLE {{ $pg.readWriteRole }} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
- ALTER ROLE {{ $pg.ownerUser }} NOINHERIT
- GRANT {{ $pg.ownerRole }} TO {{ $pg.ownerUser }}
- CREATE SCHEMA {{ $pg.schema }} AUTHORIZATION {{ $pg.ownerRole }}
- REVOKE CREATE ON SCHEMA public FROM PUBLIC
- REVOKE ALL ON SCHEMA {{ $pg.schema }} FROM PUBLIC
- GRANT USAGE ON SCHEMA {{ $pg.schema }} TO {{ $pg.readWriteRole }}
- ALTER DEFAULT PRIVILEGES FOR ROLE {{ $pg.ownerRole }} IN SCHEMA {{ $pg.schema }} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {{ $pg.readWriteRole }}
- ALTER DEFAULT PRIVILEGES FOR ROLE {{ $pg.ownerRole }} IN SCHEMA {{ $pg.schema }} GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO {{ $pg.readWriteRole }}
- ALTER DEFAULT PRIVILEGES FOR ROLE {{ $pg.ownerRole }} IN SCHEMA {{ $pg.schema }} GRANT EXECUTE ON ROUTINES TO {{ $pg.readWriteRole }}
- ALTER DEFAULT PRIVILEGES FOR ROLE {{ $pg.ownerRole }} IN SCHEMA {{ $pg.schema }} GRANT USAGE ON TYPES TO {{ $pg.readWriteRole }}
{{- end -}}

{{/* Credentials barman uses, from the snapshot backend's pod identity. */}}
{{- define "substrate.cnpg.barmanCredentials" -}}
{{- $b := .Values.objectStore.backend -}}
{{- if eq $b "s3" }}
{{- if .Values.rustfs.enabled }}
endpointURL: {{ printf "http://rustfs.%s.svc:9000" (include "substrate.namespace" .) }}
s3Credentials:
  accessKeyId:
    name: rustfs-credentials
    key: AWS_ACCESS_KEY_ID
  secretAccessKey:
    name: rustfs-credentials
    key: AWS_SECRET_ACCESS_KEY
{{- else if .Values.objectStore.s3.credentialsSecret }}
s3Credentials:
  accessKeyId:
    name: {{ .Values.objectStore.s3.credentialsSecret }}
    key: AWS_ACCESS_KEY_ID
  secretAccessKey:
    name: {{ .Values.objectStore.s3.credentialsSecret }}
    key: AWS_SECRET_ACCESS_KEY
{{- else }}
s3Credentials:
  inheritFromIAMRole: true
{{- end }}
{{- else if eq $b "gcs" }}
googleCredentials:
  gkeEnvironment: true
{{- else }}
azureCredentials:
  inheritFromAzureAD: true
{{- end }}
{{- end -}}

{{/* The CNPG Cluster (and ScheduledBackup) objects, as a YAML list. */}}
{{- define "substrate.cnpg.objects" -}}
{{- $ns := include "substrate.namespace" . -}}
{{- $pg := .Values.postgres -}}
{{- $c := $pg.cnpg -}}
{{- $presetName := include "substrate.cnpg.preset" . -}}
{{- $preset := dict -}}
{{- if $presetName -}}
{{- $preset = index (include "substrate.cnpg.presets" . | fromYaml) $presetName | default dict -}}
{{- end -}}
{{- $parameters := mergeOverwrite (deepCopy ($preset.parameters | default dict)) ($c.parameters | default dict) -}}
{{- $resources := $c.resources | default $preset.resources -}}
{{- $affinity := deepCopy ($c.affinity | default dict) -}}
{{- if and (not $c.affinity) .Values.systemInfra.cordon -}}
{{- $affinity = dict "nodeSelector" (dict "ate.dev/workloadType" "ate-postgres") "tolerations" (list (dict "key" "ate.dev/workloadType" "operator" "Equal" "value" "ate-postgres" "effect" "NoSchedule")) -}}
{{- end -}}
{{- $annotations := dict -}}
{{- if $c.keepOnUninstall -}}
{{- $_ := set $annotations "helm.sh/resource-policy" "keep" -}}
{{- end -}}
{{- $spec := dict
  "instances" (int $c.instances)
  "enableSuperuserAccess" false
  "bootstrap" (dict "initdb" (dict
    "database" $pg.database
    "owner" $pg.ownerUser
    "postInitApplicationSQL" (include "substrate.cnpg.setupSQL" . | fromYamlArray)))
  "managed" (dict "roles" (list (dict
    "name" $pg.readWriteUser
    "ensure" "present"
    "login" true
    "inherit" false
    "inRoles" (list $pg.readWriteRole)
    "passwordSecret" (dict "name" (include "substrate.cnpg.readWriteSecret" .)))))
  "storage" (dict "size" $c.storage.size)
-}}
{{- with $c.imageName }}{{ $_ := set $spec "imageName" . }}{{ end -}}
{{- with $c.storage.storageClass }}{{ $_ := set $spec.storage "storageClass" . }}{{ end -}}
{{- if $c.walStorage.enabled -}}
{{- $wal := dict "size" $c.walStorage.size -}}
{{- with $c.walStorage.storageClass }}{{ $_ := set $wal "storageClass" . }}{{ end -}}
{{- $_ := set $spec "walStorage" $wal -}}
{{- end -}}
{{- with $parameters }}{{ $_ := set $spec "postgresql" (dict "parameters" .) }}{{ end -}}
{{- with $resources }}{{ $_ := set $spec "resources" . }}{{ end -}}
{{- with $affinity }}{{ $_ := set $spec "affinity" . }}{{ end -}}
{{- with $c.serviceAccountAnnotations }}{{ $_ := set $spec "serviceAccountTemplate" (dict "metadata" (dict "annotations" .)) }}{{ end -}}
{{- if $c.monitoring.enablePodMonitor }}{{ $_ := set $spec "monitoring" (dict "enablePodMonitor" true) }}{{ end -}}
{{- if $c.backup.enabled -}}
{{- $store := mergeOverwrite (dict "destinationPath" $c.backup.destinationPath) (include "substrate.cnpg.barmanCredentials" . | fromYaml) ($c.backup.barmanObjectStore | default dict) -}}
{{- $_ := set $spec "backup" (dict "retentionPolicy" $c.backup.retentionPolicy "barmanObjectStore" $store) -}}
{{- end -}}
{{- $cluster := dict
  "apiVersion" "postgresql.cnpg.io/v1"
  "kind" "Cluster"
  "metadata" (dict "name" $c.clusterName "namespace" $ns "labels" (include "substrate.labels" . | fromYaml) "annotations" $annotations)
  "spec" $spec
-}}
{{- $out := list $cluster -}}
{{- if $c.backup.enabled -}}
{{- $out = append $out (dict
  "apiVersion" "postgresql.cnpg.io/v1"
  "kind" "ScheduledBackup"
  "metadata" (dict "name" $c.clusterName "namespace" $ns "labels" (include "substrate.labels" . | fromYaml))
  "spec" (dict "schedule" $c.backup.schedule "backupOwnerReference" "self" "cluster" (dict "name" $c.clusterName))) -}}
{{- end -}}
{{- toYaml $out -}}
{{- end -}}
