defmodule Console.AI.VectorStore do
  alias Console.AI.Vector.Elastic
  alias Console.AI.Vector.Opensearch
  alias Console.AI.Vector.Postgres
  alias Console.AI.Vector.Plural
  alias Console.AI.Vector.{Bulk, Buffer}
  alias Console.Schema.{
    DeploymentSettings,
    DeploymentSettings.AI,
    DeploymentSettings.AI.VectorStore
  }
  alias Console.Deployments.Settings

  defmodule Response do
    alias Console.Schema.{AlertResolution, StackState, ServiceComponent, Cluster, WorkbenchJob}

    @type type :: :alert | :pr | :stack | :service | :pr_automation | :catalog | :cluster | :workbench

    @type t :: %__MODULE__{
      type: type,
      pr_file: Console.Deployments.Pr.File.t,
      alert_resolution: AlertResolution.Mini.t,
      stack_state: StackState.Mini.t,
      service_component: ServiceComponent.Mini.t,
      pr_automation: PrAutomation.Mini.t,
      catalog: Catalog.Mini.t,
      cluster: Cluster.Mini.t,
      workbench_job: WorkbenchJob.Mini.t
    }

    defstruct [:pr_file, :alert_resolution, :stack_state, :service_component, :pr_automation, :catalog, :cluster, :type, :workbench_job]
  end

  @latest_version Settings.vector_store_version()

  @type store :: Console.AI.Vector.Elastic.t | Console.AI.Vector.Opensearch.t | Console.AI.Vector.Postgres.t | Console.AI.Vector.Plural.t
  @type data :: Response.t
  @type error :: Console.error

  @callback init(store) :: :ok | error
  @callback recreate(store) :: :ok | error
  @callback insert(store, struct, keyword) :: :ok | error
  @callback fetch(store, [float], keyword) :: {:ok, [data]} | error
  @callback delete(store, keyword) :: :ok | error
  @callback expire(store, keyword) :: :ok | error

  @spec enabled?() :: boolean
  def enabled?() do
    case Settings.cached() do
      %DeploymentSettings{ai: %{vector_store: %{enabled: enabled}}} -> enabled
      _ -> false
    end
  end

  def recreate() do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.recreate(store)
  end

  def init() do
    settings = Settings.fetch_consistent()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.init(store)
  end

  @doc """
  Inserts into the configured store.  Stores implementing `Console.AI.Vector.Bulk` are written
  through `Console.AI.Vector.Buffer` unless `buffer: false` is passed.
  """
  def insert(struct, opts \\ []) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
         :ok <- maybe_init(settings, store) do
      if buffer?(mod, opts),
        do: push(store, mod.prepare(store, struct, opts)),
        else: mod.insert(store, struct, opts)
    end
  end

  @spec fetch(binary, keyword) :: {:ok, [data]} | error
  def fetch(text, opts \\ []) when is_binary(text) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.fetch(store, text, opts)
  end

  @doc """
  Deletes from the configured store, buffered alongside inserts like `insert/2`.
  """
  def delete(opts \\ []) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings) do
      if buffer?(mod, opts),
        do: push(store, mod.prepare_delete(store, opts)),
        else: mod.delete(store, opts)
    end
  end

  def expire(opts \\ []) do
    settings = Settings.cached()
    with {:ok, %{__struct__: mod} = store} <- store(settings),
      do: mod.expire(store, opts)
  end

  defp buffer?(mod, opts), do: Bulk.bulk?(mod) && Keyword.get(opts, :buffer, true)

  defp push(store, {:ok, entry}), do: Buffer.push(store, entry)
  defp push(_, result), do: result

  defp maybe_init(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{initialized: true, version: version}}}, _)
    when is_integer(version) and version >= @latest_version, do: :ok
  defp maybe_init(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{initialized: true, version: version}}}, %{__struct__: mod} = store)
    when is_nil(version) or (is_integer(version) and version < @latest_version), do: mod.recreate(store)
  defp maybe_init(_, %{__struct__: mod} = store), do: mod.init(store)

  defp store(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{store: :elastic, elastic: elastic, version: version} = vs}}),
    do: {:ok, Elastic.new(elastic, version: version, settings: vs)}
  defp store(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{store: :opensearch, opensearch: opensearch, version: version} = vs}}),
    do: {:ok, Opensearch.new(opensearch, version: version, settings: vs)}
  defp store(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{store: :postgres, version: version} = vs}}),
    do: {:ok, Postgres.new(version: version, settings: vs)}
  defp store(%DeploymentSettings{ai: %AI{vector_store: %VectorStore{store: :plural, plural: %{} = plural, version: version} = vs}}),
    do: {:ok, Plural.new(plural, version: version, settings: vs)}
  defp store(_), do: {:error, "AI vector store not yet configured"}
end
