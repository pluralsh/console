defmodule Console.AI.VectorStore do
  alias Console.AI.Vector.Elastic
  alias Console.Schema.{
    DeploymentSettings,
    DeploymentSettings.AI,
    DeploymentSettings.AI.VectorStore
  }
  alias Console.Deployments.Settings

  @type store :: Console.AI.Vector.Elastic.t
  @type data :: %{pr_file: Console.Deployments.Pr.File.t}
  @type error :: Console.error

  @callback init(store) :: :ok | error
  @callback insert(store, struct) :: :ok | error
  @callback fetch(store, [float]) :: {:ok, [data]} | error

  def insert(struct) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
         :ok <- maybe_init(settings, store),
      do: mod.insert(store, struct)
  end

  def fetch(text) when is_binary(text) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.fetch(store, text)
  end

  defp maybe_init(%DeploymentSettings{ai: %AI{vector_store: %{initialized: true}}}, _), do: :ok
  defp maybe_init(_, %{__struct__: mod} = store), do: mod.init(store)

  defp store(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{store: :elastic, elastic: elastic}}}),
    do: {:ok, Elastic.new(elastic)}
  defp store(_), do: {:error, "AI vector store not yet configured"}
end
