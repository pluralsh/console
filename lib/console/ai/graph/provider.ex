defmodule Console.AI.Graph.Provider do
  alias Console.AI.Graph.Provider.Elastic
  alias Console.Schema.{
    User,
    CloudConnection,
    DeploymentSettings,
    DeploymentSettings.AI,
    DeploymentSettings.AI.Graph
  }
  alias Console.Deployments.Settings

  @type store :: Console.AI.Graph.Provider.Elastic.t
  @type error :: Console.error
  @type indexable :: Console.AI.Graph.IndexableItem.t

  @callback init(store) :: :ok | error
  @callback bulk_index(store, CloudConnection.t, [indexable]) :: :ok | error
  @callback fetch(store, binary, User.t, keyword) :: {:ok, [indexable]} | error

  @spec enabled?() :: boolean
  def enabled?() do
    case Settings.cached() do
      %DeploymentSettings{ai: %{graph: %{enabled: enabled}}} -> enabled
      _ -> false
    end
  end

  @spec bulk_index(CloudConnection.t, [indexable]) :: :ok | error
  def bulk_index(%CloudConnection{} = cloud, structs) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
         _ <- mod.init(store),
      do: mod.bulk_index(store, cloud, structs)
  end

  @spec fetch(binary, User.t, keyword) :: {:ok, [indexable]} | error
  def fetch(text, %User{} = user, opts \\ []) when is_binary(text) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.fetch(store, text, user, opts)
  end

  defp store(%DeploymentSettings{ai: %AI{graph: %Graph{store: :elastic, elastic: elastic}}}),
    do: {:ok, Elastic.new(elastic)}
  defp store(_), do: {:error, "AI graph provider not yet configured"}
end
