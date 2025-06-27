defmodule Console.Compliance.Datasource.Users do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.User

  @impl Console.Compliance.Datasource
  def stream do
    User.stream()
    |> Console.Repo.stream(method: :keyset)
    |> Stream.map(fn user ->
      %{
        id: user.id,
        name: user.name,
        email: user.email,
        admin: user.roles && user.roles.admin,
        created_at: user.inserted_at,
      }
    end)
  end
end
