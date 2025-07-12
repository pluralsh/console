defmodule Console.AI.VectorStore do
  alias Console.AI.Vector.Elastic
  alias Console.AI.Vector.Opensearch
  alias Console.Schema.{
    DeploymentSettings,
    DeploymentSettings.AI,
    DeploymentSettings.AI.VectorStore
  }
  alias Console.Deployments.Settings

  defmodule Response do
    alias Console.Schema.{AlertResolution, StackState, ServiceComponent}

    @type type :: :alert | :pr | :stack | :service

    @type t :: %__MODULE__{
      type: type,
      pr_file: Console.Deployments.Pr.File.t,
      alert_resolution: AlertResolution.Mini.t,
      stack_state: StackState.Mini.t,
      service_component: ServiceComponent.Mini.t
    }

    defstruct [:pr_file, :alert_resolution, :stack_state, :service_component, :type]
  end

  @type store :: Console.AI.Vector.Elastic.t
  @type data :: Response.t
  @type error :: Console.error

  @callback init(store) :: :ok | error
  @callback insert(store, struct, keyword) :: :ok | error
  @callback fetch(store, [float], keyword) :: {:ok, [data]} | error
  @callback delete(store, keyword) :: :ok | error

  @spec enabled?() :: boolean
  def enabled?() do
    case Settings.cached() do
      %DeploymentSettings{ai: %{vector_store: %{enabled: enabled}}} -> enabled
      _ -> false
    end
  end

  def init() do
    settings = Settings.fetch_consistent()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.init(store)
  end

  def insert(struct, opts \\ []) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
         :ok <- maybe_init(settings, store),
      do: mod.insert(store, struct, opts)
  end

  @spec fetch(binary, keyword) :: {:ok, [data]} | error
  def fetch(text, opts \\ []) when is_binary(text) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.fetch(store, text, opts)
  end

  def delete(opts \\ []) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.delete(store, opts)
  end

  defp maybe_init(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{initialized: true}}}, _), do: :ok
  defp maybe_init(_, %{__struct__: mod} = store), do: mod.init(store)

  defp store(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{store: :elastic, elastic: elastic}}}),
    do: {:ok, Elastic.new(elastic)}
  defp store(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{store: :opensearch, opensearch: opensearch}}}),
    do: {:ok, Opensearch.new(opensearch)}
  defp store(_), do: {:error, "AI vector store not yet configured"}
end
