defmodule Console.OpenAPI.SCM.Connection do
  use Console.OpenAPI.Base
  alias Console.Schema.ScmConnection

  defschema List, "A list of SCM connections", %{
    type: :object,
    description: "A list of SCM connections",
    properties: %{
      data: array_of(Connection)
    }
  }

  defschema GithubApp, "A Github App connection", %{
    type: :object,
    description: "A Github App connection",
    properties: %{
      app_id: string(description: "The Github App ID"),
      installation_id: string(description: "The Github App installation ID"),
    },
  }

  defschema %{
    type: :object,
    title: "ScmConnection",
    description: "An SCM connection for integrating with source control providers",
    properties: timestamps(%{
      id: string(),
      name: string(description: "The name of the SCM connection"),
      type: ecto_enum(ScmConnection.Type),
      default: boolean(description: "Whether this is the default SCM connection"),
      base_url: string(description: "Base URL for self-hosted versions of this provider"),
      api_url: string(description: "Base URL for HTTP APIs for self-hosted versions if different from base URL"),
      username: string(description: "The username for authentication"),
      github: GithubApp,
    }),
    required: [:name, :type]
  }
end

defmodule Console.OpenAPI.SCM.ConnectionInput do
  use Console.OpenAPI.Base
  alias Console.Schema.ScmConnection

  defschema %{
    type: :object,
    title: "ScmConnectionInput",
    description: "Input for creating or updating an SCM connection",
    properties: %{
      name: string(description: "The name of the SCM connection"),
      type: ecto_enum(ScmConnection.Type),
      default: boolean(description: "Whether this is the default SCM connection"),
      token: string(description: "The access token for authentication"),
      base_url: string(description: "Base URL for Git clones for self-hosted versions"),
      api_url: string(description: "Base URL for HTTP APIs for self-hosted versions if different from base URL"),
      username: string(description: "The username for authentication"),
      signing_private_key: string(description: "A private key used for signing commits"),
      github: Console.OpenAPI.SCM.GithubAppInput,
    },
    required: [:name, :type]
  }
end

defmodule Console.OpenAPI.SCM.GithubAppInput do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "GithubAppInput",
    description: "Github App authentication configuration",
    properties: %{
      app_id: string(description: "The GitHub App ID"),
      installation_id: string(description: "The GitHub App installation ID"),
      private_key: string(description: "The private key for the GitHub App"),
    },
    required: [:app_id, :installation_id, :private_key]
  }
end
