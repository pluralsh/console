defmodule Devbox.V1.CredentialKind do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.CredentialKind",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :CREDENTIAL_KIND_UNSPECIFIED, 0
  field :CREDENTIAL_KIND_SCM, 1
  field :CREDENTIAL_KIND_AI_PROXY, 2
  field :CREDENTIAL_KIND_CONSOLE, 3
  field :CREDENTIAL_KIND_OIDC, 4
  field :CREDENTIAL_KIND_CLAUDE_OAUTH, 5
  field :CREDENTIAL_KIND_CODEX, 6
end

defmodule Devbox.V1.CodexCredentialMode do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.CodexCredentialMode",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :CODEX_CREDENTIAL_MODE_UNSPECIFIED, 0
  field :CODEX_CREDENTIAL_MODE_CHATGPT_AUTH, 1
  field :CODEX_CREDENTIAL_MODE_ACCESS_TOKEN, 2
end

defmodule Devbox.V1.CredentialSelector do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CredentialSelector",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :kind, 1, type: Devbox.V1.CredentialKind, enum: true
  field :host, 2, type: :string
  field :identity, 3, type: :string
end

defmodule Devbox.V1.InstanceCredential do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InstanceCredential",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :kind, 1, type: Devbox.V1.CredentialKind, enum: true
  field :host, 2, type: :string
  field :identity, 3, type: :string
  field :token, 4, type: :string
  field :header_name, 5, type: :string, json_name: "headerName"
  field :header_format, 6, type: :string, json_name: "headerFormat"
  field :expires_at, 7, type: Google.Protobuf.Timestamp, json_name: "expiresAt"
  field :refresh_after, 8, type: Google.Protobuf.Timestamp, json_name: "refreshAfter"
  field :codex_mode, 10, type: Devbox.V1.CodexCredentialMode, json_name: "codexMode", enum: true
  field :credential_id, 11, type: :string, json_name: "credentialId"
  field :version, 12, type: :int64
  field :bundle_json, 13, type: :bytes, json_name: "bundleJson"
  field :refresh_lease_holder, 14, type: :bool, json_name: "refreshLeaseHolder"
  field :lease_expires_at, 15, type: Google.Protobuf.Timestamp, json_name: "leaseExpiresAt"
  field :metadata, 20, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.CloudIdentity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CloudIdentity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :cloud, 0

  field :name, 1, type: :string
  field :is_default, 2, type: :bool, json_name: "isDefault"
  field :aws, 3, type: Devbox.V1.AwsIdentity, oneof: 0
  field :gcp, 4, type: Devbox.V1.GcpIdentity, oneof: 0
  field :azure, 5, type: Devbox.V1.AzureIdentity, oneof: 0
end

defmodule Devbox.V1.AwsIdentity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AwsIdentity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :role_arn, 1, type: :string, json_name: "roleArn"
  field :duration_seconds, 2, type: :int32, json_name: "durationSeconds"
  field :session_policy, 3, type: :string, json_name: "sessionPolicy"
end

defmodule Devbox.V1.GcpIdentity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GcpIdentity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :workload_identity_provider, 1, type: :string, json_name: "workloadIdentityProvider"
  field :service_account, 2, type: :string, json_name: "serviceAccount"
end

defmodule Devbox.V1.AzureIdentity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AzureIdentity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :tenant_id, 1, type: :string, json_name: "tenantId"
  field :client_id, 2, type: :string, json_name: "clientId"
  field :authority_host, 3, type: :string, json_name: "authorityHost"
end

defmodule Devbox.V1.GetSandboxCredentialRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetSandboxCredentialRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :selector, 1, type: Devbox.V1.CredentialSelector
end

defmodule Devbox.V1.GetSandboxCredentialResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetSandboxCredentialResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :credentials, 1, repeated: true, type: Devbox.V1.InstanceCredential
end

defmodule Devbox.V1.UpdateCodexBundleRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UpdateCodexBundleRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :credential_id, 1, type: :string, json_name: "credentialId"
  field :expected_version, 2, type: :int64, json_name: "expectedVersion"
  field :bundle_json, 3, type: :bytes, json_name: "bundleJson"
  field :refreshed_at, 4, type: Google.Protobuf.Timestamp, json_name: "refreshedAt"
end

defmodule Devbox.V1.UpdateCodexBundleResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UpdateCodexBundleResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :applied, 1, type: :bool
  field :current, 2, type: Devbox.V1.InstanceCredential
end

defmodule Devbox.V1.SandboxCredentials.Service do
  @moduledoc false

  use GRPC.Service, name: "devbox.v1.SandboxCredentials", protoc_gen_elixir_version: "0.16.0"

  rpc :GetSandboxCredential,
      Devbox.V1.GetSandboxCredentialRequest,
      Devbox.V1.GetSandboxCredentialResponse

  rpc :UpdateCodexBundle, Devbox.V1.UpdateCodexBundleRequest, Devbox.V1.UpdateCodexBundleResponse
end

defmodule Devbox.V1.SandboxCredentials.Stub do
  @moduledoc false

  use GRPC.Stub, service: Devbox.V1.SandboxCredentials.Service
end
