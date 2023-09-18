defmodule Console.GraphQl.Deployments.Git do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments
  alias Console.Schema.GitRepository

  ecto_enum :auth_method, GitRepository.AuthMethod
  ecto_enum :git_health, GitRepository.Health

  input_object :git_attributes do
    field :url,         non_null(:string)
    field :private_key, :string
    field :passphrase,  :string
    field :username,    :string
    field :password,    :string
  end

  object :git_repository do
    field :id,           non_null(:id)
    field :url,          non_null(:string)
    field :auth_method,  :auth_method
    field :health,       :git_health
    field :pulled_at,    :datetime

    timestamps()
  end

  connection node_type: :git_repository

  delta :git_repository

  object :git_queries do
    connection field :git_repositories, node_type: :git_repository do
      middleware Authenticated

      resolve &Deployments.list_git_repositories/2
    end
  end

  object :git_mutations do
    field :create_git_repository, :git_repository do
      middleware Authenticated
      arg :attributes, non_null(:git_attributes)

      safe_resolve &Deployments.create_git_repository/2
    end
  end
end
