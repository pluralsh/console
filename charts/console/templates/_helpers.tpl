{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "console.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "console.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "console.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "console.labels" -}}
app.kubernetes.io/name: {{ include "console.name" . }}
helm.sh/chart: {{ include "console.chart" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "console.migration-name" -}}
console-migration-{{ .Release.Revision }}
{{- end -}}

{{- define "console.plural-config" -}}
apiVersion: platform.plural.sh/v1alpha1
kind: Config
metadata:
  name: prod
spec: {{ .Values.secrets.config | toYaml | nindent 2 }}
{{- end -}}

{{- define "console.env" -}}
- name: HOST
  value: {{ .Values.ingress.console_dns }}
{{- if .Values.externalIngress.hostname }}
- name: EXT_HOST
  value: {{ .Values.externalIngress.hostname | quote }}
{{- end }}
- name: KAS_DNS
  value: {{ .Values.ingress.kas_dns }}
- name: NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
- name: POD_IP
  valueFrom:
    fieldRef:
      fieldPath: status.podIP
- name: REPLICAS
  value: {{ .Values.replicaCount | quote }}
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POSTGRES_URL
  valueFrom:
    secretKeyRef:
      name: {{ .Values.postgres.dsnSecret | quote }}
      key: {{ .Values.postgres.dsnKey | quote }}
      optional: true
{{- end -}}