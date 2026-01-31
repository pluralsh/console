defmodule Console.OpenAPI.AccessToken do
  use Console.OpenAPI.Base

  defschema Scope, "Access token scope", %{
    type: :object,
    description: "A scope entry for an access token",
    properties: %{
      api: string(description: "A single API name"),
      apis: array_of(string(), description: "API name"),
      identifier: string(description: "Identifier for scoped access"),
      ids: array_of(string(), description: "Scoped resource ids")
    }
  }

  defschema %{
    type: :object,
    title: "AccessToken",
    description: "An access token",
    properties: timestamps(%{
      id: string(),
      token: string(),
      last_used_at: datetime(),
      expires_at: datetime(),
      scopes: array_of(Console.OpenAPI.AccessToken.Scope)
    }),
    required: [:id, :token, :inserted_at]
  }
end

defmodule Console.OpenAPI.AccessTokenInput do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "AccessTokenInput",
    description: "Input for creating a service account access token",
    properties: %{
      scopes: array_of(Console.OpenAPI.AccessToken.Scope),
      expiry: string(description: "Token TTL, e.g. 1h, 1d, 1w")
    }
  }
end
