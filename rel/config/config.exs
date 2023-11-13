import Config
import System, only: [get_env: 1]

config :arc,
  storage: Arc.Storage.GCS,
  bucket: get_env("GCS_BUCKET")

config :console,
  git_commit: get_env("GIT_COMMIT")

config :piazza_core, aes_key: get_env("AES_KEY")

if get_env("PLURAL_CLIENT_ID") do
  config :console,
    plural_login: true
  config :console, :oidc_providers,
    plural: [
      discovery_document_uri: "https://oidc.plural.sh/.well-known/openid-configuration",
      client_id: get_env("PLURAL_CLIENT_ID"),
      client_secret: get_env("PLURAL_CLIENT_SECRET"),
      redirect_uri: "https://#{get_env("HOST")}/oauth/callback",
      response_type: "code",
      scope: "openid"
    ]
end

if get_env("OIDC_CLIENT_ID") do
  config :console,
    plural_login: true
  config :console, :oidc_providers,
    plural: [
      discovery_document_uri: get_env("OIDC_DISCOVERY_URL"),
      client_id: get_env("OIDC_CLIENT_ID"),
      client_secret: get_env("OIDC_CLIENT_SECRET"),
      redirect_uri: "https://#{get_env("HOST")}/oauth/callback",
      response_type: "code",
      scope: get_env("OIDC_SCOPES") || "openid email"
    ]
end

if get_env("PROMETHEUS_HOST") do
  config :console, :prometheus, get_env("PROMETHEUS_HOST")
end

if get_env("LOKI_HOST") do
  config :console, :loki, get_env("LOKI_HOST")
end

if get_env("GRAFANA_TENANT") do
  config :console, :grafana_tenant, get_env("GRAFANA_TENANT")
end

config :elixir, :ansi_enabled, true
