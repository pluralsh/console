defmodule Console.OpenAPI.CD.GitRepository do
  use Console.OpenAPI.Base
  alias Console.Schema.GitRepository

  defschema List, "A list of git repositories", %{
    type: :object,
    description: "A list of git repositories",
    properties: %{
      data: array_of(GitRepository)
    }
  }

  defschema %{
    type: :object,
    title: "GitRepository",
    description: "A git repository",
    properties: timestamps(%{
      id: string(),
      url: string(description: "The url of the git repository, can be either an https or ssh url"),
      auth_method: ecto_enum(GitRepository.AuthMethod),
      health: ecto_enum(GitRepository.Health),
      pulled_at: datetime(description: "The last successful git pull timestamp"),
      https_path: string(description: "The https url for this git repo if you need to customize it"),
      url_format: string(description: "A format string to get the http url for a subfolder in a git repo"),
      error: string(description: "The error message for the git repository's last pull attempt"),
    })
  }
end

defmodule Console.OpenAPI.CD.GitRepositoryInput do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "GitRepositoryInput",
    description: "Input for creating or updating a git repository",
    properties: %{
      url: string(description: "The url of the git repository, can be either an https or ssh url"),
      private_key: string(description: "An ssh private key to use with this repo if an ssh url was given"),
      passphrase: string(description: "A passphrase to decrypt the given private key"),
      username: string(description: "The http username for authenticated http repos, defaults to apiKey for github"),
      password: string(description: "The http password for http authenticated repos"),
      connection_id: string(description: "The id of the scm connection to use for authentication"),
    },
    required: [:url]
  }
end
