defmodule Console.OpenAPI.User do
  use Console.OpenAPI.Base

  defschema Roles, "The roles of the user", %{
    type: :object,
    description: "The roles of the user",
    properties: %{
      admin: boolean()
    },
    required: [:admin]
  }

  defschema List, "A list of users", %{
    type: :object,
    description: "A list of users",
    properties: %{
      data: array_of(Console.OpenAPI.User)
    }
  }

  defschema %{
    type: :object,
    title: "User",
    description: "A registed user",
    properties: timestamps(%{
      id: string(),
      email: string(format: :email),
      service_account: boolean(),
      roles: Console.OpenAPI.Roles
    }),
    required: [:id, :email, :inserted_at]
  }
end
