defmodule Console.GraphQl.Deployments.Git do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments
  alias Console.Schema.GitRepository

  ecto_enum :auth_method, GitRepository.AuthMethod
  ecto_enum :git_health, GitRepository.Health

  input_object :git_attributes do
    field :url,         non_null(:string), description: "the url of this repository"
    field :private_key, :string, description: "an ssh private key to use with this repo if an ssh url was given"
    field :passphrase,  :string, description: "a passphrase to decrypt the given private key"
    field :username,    :string, description: "the http username for authenticated http repos, defaults to apiKey for github"
    field :password,    :string, description: "the http password for http authenticated repos"
  end

  @desc "a git repository available for deployments"
  object :git_repository do
    field :id,           non_null(:id), description: "internal id of this repository"
    field :url,          non_null(:string), description: "the git url of the repository, either https or ssh supported"
    field :auth_method,  :auth_method, description: "whether its a http or ssh url"
    field :health,       :git_health, description: "whether we can currently pull this repo with the provided credentials"
    field :pulled_at,    :datetime, description: "the last successsful git pull timestamp"
    field :error,        :string, description: "the error message if there were any pull errors"

    field :editable, :boolean, resolve: &Deployments.editable/3, description: "whether the current user can edit this repo"

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

    field :update_git_repository, :git_repository do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:git_attributes)

      safe_resolve &Deployments.update_git_repository/2
    end

    field :delete_git_repository, :git_repository do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_git_repository/2
    end
  end
end
