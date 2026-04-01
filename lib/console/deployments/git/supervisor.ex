defmodule Console.Deployments.Git.Supervisor do
  use DynamicSupervisor
  alias Console.Deployments.Git.Agent
  alias Console.Schema.GitRepository

  def start_link(init_arg \\ :ok) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(%GitRepository{id: id}), do: start_child(id)
  def start_child(id) when is_binary(id) do
    child = %{
      id: id,
      start: {Agent, :start_link, [id]},
      restart: :temporary
    }
    DynamicSupervisor.start_child(__MODULE__, child)
  end

  @impl true
  def init(_init_arg) do
    :ets.new(:git_cache, [:set, :public, :named_table, write_concurrency: true, read_concurrency: true])
    DynamicSupervisor.init(strategy: :one_for_one, restart: :temporary)
  end

  def register(pid, tid) do
    :ets.insert(:git_cache, {{:table, pid}, tid})
  end

  def deregister(pid) do
    :ets.delete(:git_cache, {:table, pid})
  end

  def table(pid) do
    case :ets.lookup(:git_cache, {:table, pid}) do
      [{{:table, ^pid}, tid}] -> {:ok, tid}
      _ -> {:error, :not_found}
    end
  end
end
