---
title: Plural Custom Resources
---

## dashboards.yaml

Dashboards are the source of truth for the **Dashboards** section in plural. They're very similar in structure to grafana dashboards, and you can actually scaffold them from existing grafana dashboards using the `plural from-grafana` command.

```
apiVersion: platform.plural.sh/v1alpha1
kind: Dashboard
metadata:
  name: dashboard-name
spec:
  name: postgres # name of the dashboard in the console UI
  description: Monitoring for hasura's postgres db # short description
  timeslices: [30m, 1h, 2h, 1d] # durations options to allow display for
  defaultTime: 30m
  labels: # global values to slice the dashboard further
  - name: instance
    query:
      query: pg_stat_database_tup_fetched{namespace="{{ .Release.Namespace }}"}
      label: instance
  graphs:
  - queries: # list of grouped prometheus queries per graph
    - query: SUM(pg_stat_database_tup_fetched{instance=~"$instance"})
      legend: tuples fetched
    - query: SUM(pg_stat_database_tup_inserted{instance=~"$instance"})
      legend: tuples inserted
    - query: SUM(pg_stat_database_tup_updated{instance=~"$instance"})
      legend: tuples updated
    name: Storage Performance
  - queries:
    - query: pg_settings_max_connections{instance="$instance"}
      legend: connections
    name: Max Connections
  - queries:
    - query: avg(rate(process_cpu_seconds_total{instance="$instance"}[5m]) * 1000)
      legend: seconds
    name: CPU time
  - queries:
    - query: avg(rate(process_resident_memory_bytes{instance="$instance"}[5m]))
      legend: resident mem
    - query: avg(rate(process_virtual_memory_bytes{instance="$instance"}[5m]))
      legend: process mem
    format: bytes
    name: Memory utilization
  - queries:
    - query: process_open_fds{instance="$instance"}
      legend: fds
    name: Open file descriptors
  - queries:
    - query: pg_settings_max_wal_size_bytes{instance="$instance"}
      legend: WAL size
    name: Max WAL size
  - queries:
    - query: irate(pg_stat_database_xact_commit{instance="$instance"}[5m])
      legend: commits
    - query: irate(pg_stat_database_xact_rollback{instance="$instance"}[5m])
      legend: rollbacks
    name: Transactions
  - queries:
    - query: pg_stat_database_blks_hit{instance="$instance"} / (pg_stat_database_blks_read{instance="$instance"} + pg_stat_database_blks_hit{instance="$instance"})
      legend: hit rate
    name: Cache hit rate
```

## runbook.yaml

Runbooks are dynamically generated web interfaces to provide guided experiences for operational interactions within Plural. A common one that's needed is managing the database for an application, shown here, but they're meant to be adaptable to a wide array of operational use-cases. The api is also naturally extensible if other datasources are needed.

```
apiVersion: platform.plural.sh/v1alpha1
kind: Runbook
metadata:
  name: db-scaling
  labels:
    platform.plural.sh/pinned: 'true' # whether this runbook should be on the homepage
spec:
  name: Postgres Scaling
  description: overview of how to accurately scale hasura's postgres instance
  alerts: # Alertmanager alerts to bind to this runbook
  - name: HasuraPostgresCPU
  - name: HasuraPostgresMEM
  display: |- # xml template for the layout of the runbook
{{ .Files.Get "runbooks/db-scaling.xml" | indent 4 }}
  datasources: # list of datasources to hydrate the runbook
  - name: cpu
    type: prometheus # prometheus query datasource
    prometheus:
      format: cpu
      legend: $pod
      query: sum(rate(container_cpu_usage_seconds_total{namespace="{{ .Release.Namespace }}",pod=~"plural-hasura-[0-9]+"}[5m])) by (pod)
  - name: memory
    type: prometheus
    prometheus:
      format: memory
      legend: $pod
      query: sum(container_memory_working_set_bytes{namespace="{{ .Release.Namespace }}",pod=~"plural-hasura-[0-9]+",image!="",container!=""}) by (pod)
  - name: statefulset
    type: kubernetes # kubernetes api call
    kubernetes:
      resource: statefulset
      name: plural-hasura
  - name: volume
    type: prometheus
    prometheus:
      format: none
      legend: $persistentvolumeclaim
      query: (kubelet_volume_stats_capacity_bytes{namespace="{{ .Release.Namespace }}", persistentvolumeclaim=~"pgdata-plural-hasura-.*"} - kubelet_volume_stats_available_bytes{namespace="{{ .Release.Namespace }}", persistentvolumeclaim=~"pgdata-plural-hasura-.*"}) / kubelet_volume_stats_capacity_bytes{namespace="{{ .Release.Namespace }}", persistentvolumeclaim=~"pgdata-plural-hasura-.*"}
  - name: nodes
    type: nodes # nodes api call
  actions: # actions to perform on form submits
  - name: scale
    action: config
    redirectTo: '/'
    configuration:
      updates: # path update into helm values
      - path:
        - hasura
        - postgres
        - resources
        - requests
        - cpu
        valueFrom: cpu
      - path:
        - hasura
        - postgres
        - resources
        - requests
        - memory
        valueFrom: memory
      - path:
        - hasura
        - postgres
        - replicas
        valueFrom: replicas
      - path:
        - hasura
        - postgres
        - storage
        - size
        valueFrom: volume
```

## proxies.yaml

These drive the `plural proxy connect` command, and can be used to establish local connections to databases or private web interfaces running in your cluster.

```
apiVersion: platform.plural.sh/v1alpha1
kind: Proxy
metadata:
  name: db
spec:
  type: db # establishes a db shell
  target: service/hasura-master
  credentials:
    secret: hasura.plural-hasura.credentials.postgresql.acid.zalan.do
    key: password
    user: hasura
  dbConfig:
    name: hasura
    engine: postgres
    port: 5432
```

## configurationOverlay.yaml

These drive form fields which can customize applications in the console's **Configuration** section. At the moment they resolve to a helm values update according to a yaml path.

```
{{- define "nocodb.config-overlay" -}}
apiVersion: platform.plural.sh/v1alpha1
kind: ConfigurationOverlay
metadata:
  name: my-overlay
spec:
  name: Airflow Registry
  documentation: docker repository to use for airflow (default is dkr.plural.sh/airflow/apache/airflow)
  updates: # a helm path update fo
  - path: ['airflow', 'airflow', 'airflow', 'image', 'repository']
```
