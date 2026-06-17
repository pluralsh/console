defmodule Console.Deployments.Helm.Supervisor do
  use DynamicSupervisor
  alias Console.Deployments.Helm.Agent
  require Logger

  def start_link(init_arg \\ :ok) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(url) do
    with {:ok, _} <- ensure_started() do
      child = %{
        id: url,
        start: {Agent, :start_link, [url]},
        restart: :temporary
      }

      DynamicSupervisor.start_child(__MODULE__, child)
    end
  end

  defp ensure_started() do
    case Process.whereis(__MODULE__) do
      pid when is_pid(pid) -> {:ok, pid}
      nil ->
        case start_link() do
          {:ok, pid} -> {:ok, pid}
          {:error, {:already_started, pid}} -> {:ok, pid}
          {:error, {:already_present, pid}} when is_pid(pid) -> {:ok, pid}
          {:error, {:shutdown, {:failed_to_start_child, _, {:already_started, pid}}}} -> {:ok, pid}
          {:error, reason} = err ->
            Logger.error("failed to ensure helm supervisor is started: #{inspect(reason)}")
            err
        end
    end
  end

  @impl true
  def init(_init_arg) do
    :ets.new(:helm_cache, [:set, :public, :named_table, write_concurrency: true, read_concurrency: true])
    DynamicSupervisor.init(strategy: :one_for_one, restart: :temporary)
  end

  def register(pid, tid) do
    :ets.insert(:helm_cache, {{:table, pid}, tid})
  end

  def deregister(pid) do
    :ets.delete(:helm_cache, {:table, pid})
  end

  def table(pid) do
    case :ets.lookup(:helm_cache, {:table, pid}) do
      [{{:table, ^pid}, tid}] -> {:ok, tid}
      _ -> {:error, :not_found}
    end
  end
end
