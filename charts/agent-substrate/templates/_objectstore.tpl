{{/*
The objectstore-plugin native sidecar next to ate-api-server (mode "control")
and atelet (mode "node"). With objectStore.backend=azureBlob it becomes the
objectstore-azure-blob plugin, as that plugin's kustomize config/ (and
config/assets) components patch it.

Call with (dict "ctx" $ "mode" "control").
*/}}
{{- define "substrate.objectstoreSidecar" -}}
{{- $ctx := .ctx -}}
{{- $mode := .mode -}}
{{- $ns := include "substrate.namespace" $ctx -}}
{{- $os := $ctx.Values.objectStore -}}
{{- $azure := eq $os.backend "azureBlob" -}}
{{- $az := $os.azureBlob -}}
{{- $socket := printf "/run/objectstore-plugin/%s.sock" (ternary "control" "node" (eq $mode "control")) -}}
- name: objectstore-plugin
  {{- if $azure }}
  image: {{ if $az.image.digest }}{{ printf "%s@%s" $az.image.repository $az.image.digest }}{{ else }}{{ printf "%s:%s" $az.image.repository $az.image.tag }}{{ end }}
  {{- else }}
  image: {{ include "substrate.image" (dict "ctx" $ctx "key" "objectstorePlugin" "name" "objectstore-plugin") }}
  {{- end }}
  imagePullPolicy: {{ $ctx.Values.image.pullPolicy }}
  restartPolicy: Always
  args:
    - {{ $mode }}
    - --socket={{ $socket }}
    {{- if eq $mode "node" }}
    - --root=/var/lib/ate
    {{- end }}
    {{- if $azure }}
    - --account-url={{ $az.accountUrl }}
    - --containers={{ join "," $az.containers }}
    {{- with $az.prefix }}
    - --prefix={{ . }}
    {{- end }}
    {{- end }}
    {{- if eq $mode "node" }}
    - --asset-staging-dir=/var/lib/objectstore-plugin/asset-staging
    - --asset-staging-capacity={{ $ctx.Values.atelet.objectstorePlugin.assetStagingCapacity }}
    {{- else if not $azure }}
    - --exchange-listen=:8445
    - --actor-jwt-issuer=$(ATE_API_ACTOR_JWT_ISSUER)
    - --transfer-service-account=$(ATE_API_SNAPSHOT_TRANSFER_SERVICE_ACCOUNT)
    {{- end }}
    {{- if not $azure }}
    - {{ include "substrate.previewArg" $ctx }}
    {{- end }}
  {{- if eq $mode "control" }}
  ports:
    - name: exchange
      containerPort: 8445
  {{- end }}
  startupProbe:
    exec:
      command:
        - {{ ternary "/ko-app/azure-blob-objectstore-plugin" "/ko-app/objectstore-plugin" $azure }}
        - healthcheck
        - --socket={{ $socket }}
    periodSeconds: 2
    failureThreshold: 30
  securityContext:
    allowPrivilegeEscalation: false
    {{- if eq $mode "node" }}
    runAsUser: 0
    runAsGroup: 0
    {{- else }}
    runAsNonRoot: true
    {{- end }}
    capabilities:
      drop:
        - ALL
  {{- if eq $mode "node" }}
  {{- with $ctx.Values.atelet.objectstorePlugin.resources }}
  resources:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- end }}
  env:
    {{- if not $azure }}
    {{- include "substrate.objectstoreBackendEnv" $ctx | nindent 4 }}
    {{- end }}
    {{- if eq $mode "control" }}
    - name: ATE_API_ACTOR_JWT_ISSUER
      valueFrom:
        configMapKeyRef:
          name: ate-api-server-envvars
          key: ATE_API_ACTOR_JWT_ISSUER
    - name: ATE_API_SNAPSHOT_TRANSFER_SERVICE_ACCOUNT
      valueFrom:
        configMapKeyRef:
          name: ate-api-server-envvars
          key: ATE_API_SNAPSHOT_TRANSFER_SERVICE_ACCOUNT
    {{- end }}
    - name: POD_NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
    {{- if $azure }}
    - name: AZURE_CLIENT_ID
      value: {{ ternary $az.controlClientId $az.nodeClientId (eq $mode "control") | quote }}
    - name: AZURE_TENANT_ID
      value: {{ $az.tenantId | quote }}
    - name: AZURE_FEDERATED_TOKEN_FILE
      value: /var/run/secrets/azure/tokens/azure-identity-token
    {{- if and (eq $mode "node") $az.assetContainers }}
    - name: AZURE_STORAGE_ASSET_CONTAINERS
      value: {{ join "," $az.assetContainers | quote }}
    {{- end }}
    {{- end }}
  envFrom:
    - configMapRef:
        name: ate-otel-config
  volumeMounts:
    {{- if eq $mode "node" }}
    - name: ate-base
      mountPath: /var/lib/ate
      mountPropagation: HostToContainer
    {{- end }}
    - name: objectstore-plugin
      mountPath: /run/objectstore-plugin
    {{- if eq $mode "node" }}
    - name: servicedns-ca
      mountPath: /run/servicedns.podcert.ate.dev
      readOnly: true
    - name: asset-staging
      mountPath: /var/lib/objectstore-plugin/asset-staging
    {{- else }}
    - name: servicedns
      mountPath: /run/servicedns.podcert.ate.dev
      readOnly: true
    - name: podidentity
      mountPath: /run/podidentity.podcert.ate.dev
      readOnly: true
    {{- end }}
    {{- if $azure }}
    - name: azure-identity-token
      mountPath: /var/run/secrets/azure/tokens
      readOnly: true
    {{- end }}
{{- end -}}

{{/* Volume the Azure plugin reads its workload identity token from. */}}
{{- define "substrate.azureTokenVolume" -}}
{{- if eq .Values.objectStore.backend "azureBlob" }}
- name: azure-identity-token
  projected:
    sources:
      - serviceAccountToken:
          audience: api://AzureADTokenExchange
          expirationSeconds: {{ .Values.objectStore.azureBlob.tokenExpirationSeconds }}
          path: azure-identity-token
{{- end }}
{{- end -}}

{{/* ATE_STORAGE_BACKEND and its settings for Substrate's own plugin. */}}
{{- define "substrate.objectstoreBackendEnv" -}}
{{- $os := .Values.objectStore -}}
- name: ATE_STORAGE_BACKEND
  value: {{ $os.backend | quote }}
{{- if eq $os.backend "s3" }}
{{- if .Values.rustfs.enabled }}
- name: AWS_REGION
  value: {{ $os.s3.region | default "us-east-1" | quote }}
- name: AWS_ENDPOINT_URL
  value: {{ printf "http://rustfs.%s.svc:9000" (include "substrate.namespace" .) | quote }}
- name: AWS_S3_USE_PATH_STYLE
  value: "true"
- name: AWS_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: rustfs-credentials
      key: AWS_ACCESS_KEY_ID
- name: AWS_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: rustfs-credentials
      key: AWS_SECRET_ACCESS_KEY
{{- else }}
{{- with $os.s3.region }}
- name: AWS_REGION
  value: {{ . | quote }}
{{- end }}
{{- with $os.s3.endpoint }}
- name: AWS_ENDPOINT_URL
  value: {{ . | quote }}
{{- end }}
{{- if $os.s3.usePathStyle }}
- name: AWS_S3_USE_PATH_STYLE
  value: "true"
{{- end }}
{{- with $os.s3.credentialsSecret }}
- name: AWS_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: {{ . }}
      key: AWS_ACCESS_KEY_ID
- name: AWS_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: {{ . }}
      key: AWS_SECRET_ACCESS_KEY
{{- end }}
{{- end }}
{{- end }}
{{- end -}}
