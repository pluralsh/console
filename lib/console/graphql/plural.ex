defmodule Console.GraphQl.Plural do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Plural
  alias Console.Middleware.{RequiresGit}

  input_object :smtp_input do
    field :server,   :string
    field :port,     :integer
    field :password, :string
    field :sender,   :string
    field :user,     :string
  end

  input_object :context_attributes do
    field :buckets,       list_of(:string)
    field :domain,        list_of(:string)
    field :configuration, non_null(:map)
    field :protect,       list_of(:string)
  end

  object :smtp do
    field :server,   :string
    field :port,     :integer
    field :password, :string
    field :sender,   :string
    field :user,     :string
  end

  object :installation do
    field :id, non_null(:id)
    field :repository, :repository
  end

  object :repository do
    field :id,            non_null(:id)
    field :name,          non_null(:string)
    field :description,   :string
    field :icon,          :string
    field :docs,          list_of(:file_content)
    field :configuration, :configuration, resolve: &Plural.resolve_configuration/3
    field :grafana_dns,   :string, resolve: fn _, _, _ ->
      {:ok, Console.conf(:grafana_dns)}
    end
  end

  object :file_content do
    field :path,    :string
    field :content, :string
  end

  object :recipe do
    field :id,              non_null(:id)
    field :name,            non_null(:string)
    field :description,     :string
    field :provider,        :string
    field :restricted,      :boolean
    field :recipe_sections, list_of(:recipe_section)
    field :oidc_enabled,    :boolean, resolve: fn
      %{oidcSettings: %{}}, _, _ -> {:ok, true}
      %{recipeDependencies: [_ | _] = deps}, _, _ ->
        {:ok, Enum.any?(deps, &is_map(&1.oidcSettings))}
      _, _, _ -> {:ok, false}
    end
  end

  object :recipe_section do
    field :id,            non_null(:id)
    field :repository,    :repository
    field :recipe_items,  list_of(:recipe_item)
    field :configuration, list_of(:configuration_item)
  end

  object :recipe_item do
    field :id, non_null(:id)
    field :configuration, list_of(:configuration_item)
  end

  object :configuration_item do
    field :name,          :string
    field :type,          :string
    field :placeholder,   :string
    field :documentation, :string
    field :default,       :string
    field :optional,      :boolean
    field :condition,     :configuration_condition
    field :validation,    :configuration_validation
  end

  object :configuration_validation do
    field :type,    :string
    field :regex,   :string
    field :message, :string
  end

  object :configuration_condition do
    field :field,     :string
    field :value,     :string
    field :operation, :string
  end

  object :stack do
    field :id,       non_null(:id)
    field :name,     non_null(:string)
    field :bundles,  list_of(:recipe)
    field :sections, list_of(:recipe_section)

    timestamps()
  end

  object :repository_context do
    field :repository, non_null(:string)
    field :context,    :map
  end

  object :plural_context do
    field :buckets,       list_of(:string)
    field :domains,       list_of(:string)
    field :configuration, non_null(:map)
  end

  object :account do
    datetime_func :delinquent_at, :delinquentAt
    datetime_func :grandfathered_until, :grandfatheredUntil
    key_func :available_features, :available_features, :availableFeatures
    field :subscription, :plural_subscription
  end

  object :plural_subscription do
    field :id,   :id
    field :plan, :plan
  end

  object :plan do
    field :id,     :id
    field :name,   :string
    field :period, :string
  end

  connection node_type: :installation
  connection node_type: :repository
  connection node_type: :recipe

  object :plural_queries do
    field :ai, :string do
      middleware Authenticated
      arg :prompt, non_null(:string)

      resolve &Plural.ai/2
    end

    field :account, :account do
      middleware Authenticated

      resolve &Plural.account/2
    end

    connection field :installations, node_type: :installation do
      middleware Authenticated

      resolve &Plural.list_installations/2
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

    field :repository, :repository do
      middleware Authenticated
      arg :name, non_null(:string)

      resolve &Plural.get_repository/2
    end

    connection field :repositories, node_type: :repository do
      middleware Authenticated
      arg :query, non_null(:string)

      resolve &Plural.search_repositories/2
    end

    connection field :recipes, node_type: :recipe do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Plural.list_recipes/2
    end

    field :context, list_of(:repository_context) do
      middleware Authenticated
      middleware Rbac, perm: :deploy, arg: :id

      resolve &Plural.resolve_context/2
    end

    field :plural_context, :plural_context do
      middleware Authenticated
      middleware Rbac, perm: :deploy, arg: :id

      resolve &Plural.resolve_plural_context/2
    end

    field :recipe, :recipe do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Plural.get_recipe/2
    end

    field :stack, :stack do
      middleware Authenticated
      arg :name, non_null(:string)

      resolve &Plural.get_stack/2
    end

    field :smtp, :smtp do
      middleware Authenticated
      middleware AdminRequired

      resolve fn _, _ ->
        with {:ok, context} <- Console.Plural.Context.get(),
          do: {:ok, context.smtp}
      end
    end
  end

  object :plural_mutations do
    field :install_recipe, :build do
      middleware Authenticated
      middleware RequiresGit
      middleware Rbac, perm: :deploy, arg: :id

      arg :id,      non_null(:id)
      arg :context, non_null(:map)
      arg :oidc,    :boolean

      safe_resolve &Plural.install_recipe/2
    end

    field :install_stack, :build do
      middleware Authenticated
      middleware RequiresGit
      middleware Rbac, perm: :deploy, arg: :id

      arg :name,    non_null(:string)
      arg :context, non_null(:context_attributes)
      arg :oidc,    :boolean

      safe_resolve &Plural.install_stack/2
    end

    field :update_smtp, :smtp do
      middleware Authenticated
      middleware AdminRequired
      middleware RequiresGit
      arg :smtp, non_null(:smtp_input)

      safe_resolve &Plural.update_smtp/2
    end

    field :update_configuration, :configuration do
      middleware Authenticated
      middleware RequiresGit
      arg :repository, non_null(:string)
      arg :content,    non_null(:string)
      arg :tool,       :tool
      arg :message,    :string
      middleware Rbac, perm: :configure, arg: :repository

      safe_resolve &Plural.update_configuration/2
    end
  end
end
