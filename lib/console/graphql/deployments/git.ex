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
    field :https_path,  :string, description: "a manually supplied https path for non standard git setups.  This is auto-inferred in many cases"
    field :url_format,  :string, description: "similar to https_path, a manually supplied url format for custom git.  Should be something like {url}/tree/{ref}/{folder}"
  end

  @desc "a git repository available for deployments"
  object :git_repository do
    field :id,           non_null(:id), description: "internal id of this repository"
    field :url,          non_null(:string), description: "the git url of the repository, either https or ssh supported"
    field :auth_method,  :auth_method, description: "whether its a http or ssh url"
    field :health,       :git_health, description: "whether we can currently pull this repo with the provided credentials"
    field :pulled_at,    :datetime, description: "the last successsful git pull timestamp"
    field :error,        :string, description: "the error message if there were any pull errors"
    field :https_path,   :string, description: "the https url for this git repo"
    field :url_format,   :string, description: "a format string to get the http url for a subfolder in a git repo"

    field :editable, :boolean,
      resolve: &Deployments.editable/3,
      description: "whether the current user can edit this repo"

    timestamps()
  end

  @desc "a crd representation of a helm repository"
  object :helm_repository do
    field :metadata, non_null(:metadata)
    field :spec,     non_null(:helm_repository_spec)
    field :status,   :helm_repository_status,
      resolve: &Deployments.helm_status/3,
      description: "can fetch the status of a given helm repository"
  end

  @desc "a specification of how a helm repository is fetched"
  object :helm_repository_spec do
    field :provider, non_null(:string)
    field :url,      non_null(:string)
    field :type,     non_null(:string)
  end

  @desc "the state of this helm repository"
  object :helm_repository_status do
    field :ready,   :boolean
    field :message, :string
  end

  connection node_type: :git_repository

  delta :git_repository

  object :git_queries do
    field :git_repository, :git_repository do
      middleware Authenticated
      arg :id,  :id
      arg :url, :string

      resolve &Deployments.resolve_git/2
    end

    connection field :git_repositories, node_type: :git_repository do
      middleware Authenticated

      resolve &Deployments.list_git_repositories/2
    end

    field :helm_repositories, list_of(:helm_repository) do
      middleware Authenticated

      resolve &Deployments.list_helm_repositories/2
    end

    field :helm_repository, :helm_repository do
      middleware Authenticated
      arg :name,      non_null(:string)
      arg :namespace, non_null(:string)

      resolve &Deployments.get_helm_repository/2
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
