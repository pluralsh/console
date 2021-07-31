defmodule Console.GraphQl.Plural do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Plural
  alias Console.Middleware.Authenticated

  object :installation do
    field :id, non_null(:id)
    field :repository, :repository
  end

  object :repository do
    field :id,            non_null(:id)
    field :name,          non_null(:string)
    field :description,   :string
    field :icon,          :string
    field :configuration, :configuration, resolve: &Plural.resolve_configuration/3
    field :grafana_dns,   :string, resolve: fn _, _, _ ->
      {:ok, Console.conf(:grafana_dns)}
    end
  end

  object :recipe do
    field :id,              non_null(:id)
    field :name,            non_null(:string)
    field :description,     :string
    field :provider,        :string
    field :recipe_sections, list_of(:recipe_section)
  end

  object :recipe_section do
    field :id,           non_null(:id)
    field :repository,   :repository
    field :recipe_items, list_of(:recipe_item)
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
  end

  connection node_type: :installation
  connection node_type: :repository
  connection node_type: :recipe

  object :plural_queries do
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

    field :recipe, :recipe do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Plural.get_recipe/2
    end
  end
end
