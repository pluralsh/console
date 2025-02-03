defmodule Console.GraphQl.Configuration do
  use Console.GraphQl.Schema.Base
  require Logger

  object :log_label do
    field :name,  :string
    field :value, :string
  end

  object :plural_manifest do
    field :network,       :manifest_network
    field :bucket_prefix, :string
    field :cluster,       :string
  end

  object :manifest_network do
    field :plural_dns, :boolean
    field :subdomain,  :string
  end

  object :git_status do
    field :cloned, :boolean
    field :output, :string
  end

  object :available_features do
    field :vpn,    :boolean
    field :audits, :boolean
    field :cd,     :boolean

    key_func :user_management,     :boolean, :userManagement
    key_func :database_management, :boolean, :databaseManagement
  end

  object :console_configuration do
    field :git_commit,      :string
    field :console_version, :string, resolve: fn _, _, _ -> {:ok, Console.version()} end
    field :is_demo_project, :boolean
    field :is_sandbox,      :boolean
    field :plural_login,    :boolean
    field :vpn_enabled,     :boolean
    field :installed,       :boolean,
      resolve: fn _, _, _ -> {:ok, Console.Deployments.Clusters.installed?()} end,
      description: "whether at least one cluster has been installed, false if a user hasn't fully onboarded"
    field :cloud,           :boolean, resolve: fn _, _, _ -> {:ok, Console.cloud?()} end
    field :byok,            :boolean, resolve: fn _, _, _ -> {:ok, Console.byok?()} end
    field :external_oidc,   :boolean, resolve: fn _, _, _ -> {:ok, !!Console.conf(:oidc_login)} end
    field :oidc_name,       :string,  resolve: fn _, _, _ -> {:ok, Console.conf(:oidc_name)} end
    field :features,        :available_features

    field :manifest,        :plural_manifest, resolve: fn
      _, _, _ ->
        case Console.Plural.Manifest.get() do
          {:ok, _} = res -> res
          error ->
            Logger.info "could not fetch manifest: #{inspect(error)}"
            {:ok, %{}}
        end
    end

    field :git_status, :git_status, resolve: fn
      _, _, _ -> {:ok, Console.Bootstrapper.status()}
    end
  end

  object :configuration_queries do
    field :configuration, :console_configuration do
      resolve fn _, _ -> {:ok, Console.Configuration.new()} end
    end
  end
end
