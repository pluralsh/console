{{- define "substrate.cnpg.host" -}}
{{- printf "%s-rw.%s.svc" .Values.postgres.cnpg.clusterName (include "substrate.namespace" .) -}}
{{- end -}}

{{- define "substrate.cnpg.readWriteSecret" -}}
{{- printf "%s-readwrite" .Values.postgres.cnpg.clusterName -}}
{{- end -}}

{{- define "substrate.cnpg.preset" -}}
{{- .Values.postgres.cnpg.preset | default (ternary "size10" "" (eq .Values.clusterSize "size10")) -}}
{{- end -}}

{{/* pgxpool parameters ate-setup appends to its DSNs for size10. */}}
{{- define "substrate.postgres.poolParams" -}}
{{- if eq .Values.clusterSize "size10" -}}&pool_max_conns=64&pool_min_conns=4{{- end -}}
{{- end -}}

{{/* DSN env for ate-api-server's main container. */}}
{{- define "substrate.postgres.env" -}}
{{- $pg := .Values.postgres -}}
{{- if eq $pg.mode "cnpg" }}
{{- $q := printf "sslmode=verify-full&sslrootcert=/run/postgres-server-ca/server-ca.pem%s" (include "substrate.postgres.poolParams" .) }}
- name: PG_OWNER_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ $pg.cnpg.clusterName }}-app
      key: password
- name: PG_READ_WRITE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "substrate.cnpg.readWriteSecret" . }}
      key: password
- name: ATE_API_POSTGRES_OWNER_CONNECTION_STRING
  value: {{ printf "postgresql://%s:$(PG_OWNER_PASSWORD)@%s:5432/%s?%s" $pg.ownerUser (include "substrate.cnpg.host" .) $pg.database $q | quote }}
- name: ATE_API_POSTGRES_READ_WRITE_CONNECTION_STRING
  value: {{ printf "postgresql://%s:$(PG_READ_WRITE_PASSWORD)@%s:5432/%s?%s" $pg.readWriteUser (include "substrate.cnpg.host" .) $pg.database $q | quote }}
{{- else }}
- name: ATE_API_POSTGRES_READ_WRITE_CONNECTION_STRING
  valueFrom:
    secretKeyRef:
      name: {{ $pg.external.readWrite.secretName }}
      key: {{ $pg.external.readWrite.key }}
- name: ATE_API_POSTGRES_OWNER_CONNECTION_STRING
  valueFrom:
    secretKeyRef:
      name: {{ $pg.external.owner.secretName | default $pg.external.readWrite.secretName }}
      key: {{ ternary $pg.external.owner.key $pg.external.readWrite.key (not (empty $pg.external.owner.secretName)) }}
{{- end }}
{{- end -}}

{{/* The server CA ate-api-server verifies Postgres against. */}}
{{- define "substrate.postgres.serverCAVolume" -}}
{{- $pg := .Values.postgres -}}
- name: postgres-server-ca
  secret:
    {{- if eq $pg.mode "cnpg" }}
    secretName: {{ $pg.cnpg.clusterName }}-ca
    items:
      - key: ca.crt
        path: server-ca.pem
    {{- else if $pg.external.serverCA.pem }}
    secretName: postgres-server-ca
    {{- else if $pg.external.serverCA.secretName }}
    secretName: {{ $pg.external.serverCA.secretName }}
    items:
      - key: {{ $pg.external.serverCA.key }}
        path: server-ca.pem
    {{- else }}
    secretName: postgres-server-ca
    optional: true
    {{- end }}
{{- end -}}
