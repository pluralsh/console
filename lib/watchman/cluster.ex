defmodule Watchman.Cluster do
  require Logger
  @behaviour :ra_machine

  @cluster :watchman
  @timeout 10_000

  defmodule State, do: defstruct [:pid, :lock, :node]

  def servers(), do: Enum.map(nodes(), & {:deploy, &1})

  def nodes(), do: Enum.uniq([node() | Watchman.conf(:nodes)])

  def me(), do: {:deploy, node()}

  def start_cluster() do
    Logger.info "starting raft on #{node()}"
    Enum.each(nodes(), fn n ->
      Logger.info "pinging #{n} from #{node()}"
      :net_adm.ping(n)
    end)

    case :ra_directory.uid_of(@cluster) do
      :undefined -> :ra.start_server(@cluster, me(), {:module, __MODULE__, %State{}}, servers())
      _ -> :ra.restart_server(me())
    end
    |> maybe_reelect()
  end

  @impl :ra_machine
  def init(state), do: state

  @impl :ra_machine
  def apply(_, {:lock, ref}, %{lock: nil, pid: nil} = state),
    do: {%{state | lock: ref}, :ok, []}

  def apply(_, {:lock, _}, state),
    do: {state, :locked, []}

  def apply(_, {:unlock, ref}, %{lock: ref} = state),
    do: {%{state | lock: nil}, :ok, []}

  def apply(_, {:unlock, _}, state),
    do: {state, :error, []}

  def apply(_, {:save, pid, node}, state) do
    Logger.info "deployer is now set to: #{inspect(pid)}"
    {%{state | pid: pid}, :ok, [{:monitor, :process, pid}, {:monitor, :node, node}]}
  end

  def apply(_, {:nodedown, node}, %{node: node} = state) do
    Logger.info "node down, restarting"
    Watchman.Elector.kick()
    {%{state | pid: nil, node: nil, lock: nil}, :ok, [{:demonitor, :node, node}]}
  end

  def apply(_, {:down, pid, _}, state) do
    Logger.info "attempting to restart deployer #{node()}"
    Watchman.Elector.kick()
    {%{state | pid: nil, node: nil, lock: nil}, :ok, []}
  end

  def apply(_, :fetch, %{pid: pid} = state), do: {state, pid, []}

  def apply(_, _, state), do: {state, :ok, []}

  def call(msg), do: :ra.process_command(me(), msg)

  def fetch() do
    call(:fetch)
    |> result()
  end

  def lock(pid) do
    call({:lock, pid})
    |> result()
  end

  def unlock(pid) do
    call({:unlock, pid})
    |> result()
  end

  def save(pid, node) do
    call({:save, pid, node})
    |> result()
  end

  def down() do
    call({:down, :ignore, :ignore})
    |> result()
  end

  defp result({:ok, res, _}), do: res
  defp result(err), do: err

  defp maybe_reelect(:ok) do
    :ra.trigger_election(me())
    with {:ok, _, _} <- :ra.members(me(), @timeout),
      do: :ok
  end
  defp maybe_reelect(res), do: res
end