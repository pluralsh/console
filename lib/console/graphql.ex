defmodule Console.GraphQl do
  use Absinthe.Schema
  use Absinthe.Relay.Schema, :modern
  import Console.GraphQl.Helpers
  alias Console.GraphQl.Resolvers.{Build, Plural, Webhook, User}
  alias Console.Middleware.{Authenticated, Rbac}

  import_types Absinthe.Type.Custom
  import_types Console.GraphQl.Schema.Base
  import_types Console.GraphQl.Schema
  import_types Console.GraphQl.Users
  import_types Console.GraphQl.Kubernetes
  import_types Console.GraphQl.Observability
  import_types Console.GraphQl.Audit

  @sources [
    Build,
    User,
  ]

  def context(ctx) do
    loader = make_dataloader(@sources, ctx)
    Map.put(ctx, :loader, loader)
  end

  defp make_dataloader(sources, ctx) do
    Enum.reduce(sources, Dataloader.new(), fn source, loader ->
      Dataloader.add_source(loader, source, source.data(ctx))
    end)
  end

  def plugins do
    [Absinthe.Middleware.Dataloader] ++ Absinthe.Plugin.defaults()
  end

  query do
    connection field :builds, node_type: :build do
      middleware Authenticated

      resolve &Build.list_builds/2
    end

    field :configuration, :console_configuration do
      resolve fn _, _ -> {:ok, Console.Configuration.new()} end
    end

    field :build, :build do
      middleware Authenticated

      arg :id, non_null(:id)

      resolve safe_resolver(&Build.resolve_build/2)
    end

    connection field :installations, node_type: :installation do
      middleware Authenticated

      resolve &Plural.list_installations/2
    end

    connection field :webhooks, node_type: :webhook do
      middleware Authenticated

      resolve &Webhook.list_webhooks/2
    end

    field :applications, list_of(:application) do
      middleware Authenticated

      resolve &Plural.list_applications/2
    end

    field :application, :application do
      middleware Authenticated
      arg :name, non_null(:string)

      resolve &Plural.resolve_application/2
    end

    field :external_token, :string do
      middleware Authenticated
      resolve &Plural.resolve_external_token/2
    end

    import_fields :user_queries
    import_fields :observability_queries
    import_fields :kubernetes_queries
    import_fields :audit_queries
  end

  mutation do
    field :create_build, :build do
      middleware Authenticated
      arg :attributes, non_null(:build_attributes)

      middleware Rbac, perm: :deploy, arg: [:attributes, :repository]
      resolve safe_resolver(&Build.create_build/2)
    end

    field :cancel_build, :build do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve safe_resolver(&Build.cancel_build/2)
    end

    field :approve_build, :build do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve safe_resolver(&Build.approve_build/2)
    end

    field :create_webhook, :webhook do
      middleware Authenticated

      arg :attributes, non_null(:webhook_attributes)

      resolve safe_resolver(&Webhook.create_webhook/2)
    end

    field :update_configuration, :configuration do
      middleware Authenticated
      arg :repository, non_null(:string)
      arg :content,    non_null(:string)
      arg :tool,       :tool

      middleware Rbac, perm: :configure, arg: :repository
      resolve safe_resolver(&Plural.update_configuration/2)
    end

    import_fields :user_mutations
    import_fields :kubernetes_mutations
  end

  subscription do
    field :build_delta, :build_delta do
      arg :build_id, :id

      config fn
        %{id: id}, _ when is_binary(id) -> {:ok, topic: "builds:#{id}"}
        _, _ -> {:ok, topic: "builds"}
      end
    end

    field :command_delta, :command_delta do
      arg :build_id, non_null(:id)

      config fn %{build_id: build_id}, _ -> {:ok, topic: "commands:#{build_id}"} end
    end

    field :application_delta, :application_delta do
      config fn _, _ -> {:ok, topic: "applications"} end
    end
  end

  def safe_resolver(fun) do
    fn args, ctx ->
      try do
        case fun.(args, ctx) do
          {:ok, res} -> {:ok, res}
          {:error, %Ecto.Changeset{} = cs} -> {:error, resolve_changeset(cs)}
          error -> error
        end
      rescue
        error -> {:error, Exception.message(error)}
      end
    end
  end
end
