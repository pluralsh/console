defmodule Console.Logs.Provider do
  alias Console.Logs.{Query, Line}
  alias Console.Logs.Provider.{Victoria, Elastic, Loki}
  alias Console.Schema.{User, DeploymentSettings}

  @type error :: Console.error

  @callback query(struct, Query.t) :: {:ok, [Line.t]} | error
  @callback aggregate(struct, Query.t) :: {:ok, [map()]} | error
  @callback labels(struct, Query.t) :: {:ok, [%{label: String.t, count: integer()}]} | error

  @spec query(Query.t) :: {:ok, [Line.t]} | error
  def query(%Query{} = q) do
    with {:ok, %{__struct__: provider} = prov, settings} <- client(),
      do: provider.query(prov, levels(q, settings))
  end

  @spec aggregate(Query.t) :: {:ok, [map()]} | error
  def aggregate(%Query{} = q) do
    with {:ok, %{__struct__: provider} = prov, settings} <- client(),
      do: provider.aggregate(prov, levels(q, settings))
  end

  def labels(%Query{} = q) do
    with {:ok, %{__struct__: provider} = prov, settings} <- client(),
      do: provider.labels(prov, levels(q, settings))
  end

  # stores without levels would match nothing on a level filter, so drop level args unless the store has them
  @spec levels(Query.t, DeploymentSettings.t) :: Query.t
  def levels(%Query{} = q, %DeploymentSettings{logging: %{levels: true} = logging}),
    do: %{q | level_field: logging.level_field}
  def levels(%Query{} = q, _), do: %{q | levels: nil, group_by_level: false}

  @spec accessible(Query.t, User.t) :: {:ok, Query.t} | error
  def accessible(%Query{} = query, %User{} = user), do: Query.accessible(query, user)

  def enabled?() do
    case client() do
      {:ok, _, _} -> true
      _ -> false
    end
  end

  defp client() do
    settings = Console.Deployments.Settings.cached()
    with {:ok, prov} <- client(settings),
      do: {:ok, prov, settings}
  end

  def client(%DeploymentSettings{logging: %{enabled: true, driver: :victoria, victoria: %{} = victoria}}),
    do: {:ok, Victoria.new(victoria)}
  def client(%DeploymentSettings{logging: %{enabled: true, driver: :elastic, elastic: %{} = elastic}}),
    do: {:ok, Elastic.new(elastic)}
  def client(%DeploymentSettings{logging: %{enabled: true, driver: :loki, loki: %{} = loki}}),
    do: {:ok, Loki.new(loki)}
  def client(_), do: {:error, "Plural logging integration not yet configured"}
end
