defmodule Console.GraphQl.Configuration do
  use Console.GraphQl.Schema.Base
  alias Console.Middleware.{Authenticated, Sandboxed}
  alias Console.GraphQl.Resolvers.Plural

  object :configuration do
    field :terraform, :string
    field :helm,      :string
  end

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
    field :vpn, :boolean
    field :audits, :boolean
    key_func :user_management, :boolean, :userManagement
  end

  object :console_configuration do
    field :git_commit,      :string
    field :is_demo_project, :boolean
    field :is_sandbox,      :boolean
    field :plural_login,    :boolean
    field :vpn_enabled,     :boolean
    field :features,        :available_features

    field :manifest,        :plural_manifest, resolve: fn
      _, _, _ ->
        case Console.Plural.Manifest.get() do
          {:ok, _} = res -> res
          _ -> {:ok, %{}}
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

    field :external_token, :string do
      middleware Authenticated
      middleware Sandboxed
      resolve &Plural.resolve_external_token/2
    end
  end
end
