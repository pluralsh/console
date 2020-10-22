defmodule Watchman.Cluster do
  require Logger
  @behaviour :ra_machine

  @cluster :watchman
  @timeout 10_000

  defmodule State, do: defstruct [:pid, :storage]

  @impl :ra_machine
  def init(state), do: state

  @impl :ra_machine
  def apply(_, {:save, pid}, %{pid: nil} = state) do
    {%{state | pid: pid}, pid, [{:monitor, :process, pid}]}
  end

  def apply(_, {:save, pid}, %{pid: curr} = state) when is_pid(curr) do
    Logger.info "trying to save #{inspect(pid)} but already using #{inspect(curr)}"
    Process.exit(pid, :kill)
    {state, pid, [{:monitor, :process, pid}]}
  end


  def apply(_, {:down, pid, _}, %{pid: pid} = state) do
    boot = Process.whereis(Watchman.Bootstrapper)
    {%{state | pid: nil}, :ok, [{:send, boot, :cluster}]}
  end

  def apply(_, {:down, _, _} = msg, state) do
    IO.inspect(msg)
    {state, :ok, []}
  end

  def apply(_, :fetch, %{pid: pid} = state), do: {state, pid, []}

  def call(msg), do: :ra.process_command(me(), msg)

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

  defp maybe_reelect(:ok) do
    :ra.trigger_election(me())
    with {:ok, _, _} <- :ra.members(me(), @timeout),
      do: :ok
  end
  defp maybe_reelect(res), do: res

  def servers(), do: Enum.map(nodes(), & {:deploy, &1})

  def nodes(), do: Enum.uniq([node() | Watchman.conf(:nodes)])

  def me(), do: {:deploy, node()}
end