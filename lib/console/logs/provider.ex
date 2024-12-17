defmodule Console.Logs.Provider do
  alias Console.Logs.{Query, Line}
  alias Console.Logs.Provider.{Victoria}
  alias Console.Schema.{User, DeploymentSettings}

  @type error :: Console.error

  @callback query(struct, Query.t) :: {:ok, [Line.t]} | error

  @spec query(Query.t) :: {:ok, [Line.t]} | error
  def query(%Query{} = q) do
    with {:ok, %{__struct__: provider} = prov} <- client(),
      do: provider.query(prov, q)
  end

  @spec accessible(Query.t, User.t) :: {:ok, Query.t} | error
  def accessible(%Query{} = query, %User{} = user), do: Query.accessible(query, user)

  defp client() do
    Console.Deployments.Settings.cached()
    |> client()
  end

  def client(%DeploymentSettings{logging: %{enabled: true, driver: :victoria, victoria: %{} = victoria}}),
    do: {:ok, Victoria.new(victoria)}
  def client(_), do: {:error, "Plural logging integration not yet configured"}
end
