defmodule Watchman.Cluster do
  require Logger
  @behaviour :ra_machine

  @cluster :watchman
  @timeout 10_000

  defmodule State, do: defstruct [:lock, :timeout]

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

  def now(), do: :os.system_time(:millisecond)
  def timeout(), do: :os.system_time(:millisecond) + 1000 * 60 * 2

  @impl :ra_machine
  def apply(_, {:lock, ref}, %{lock: nil} = state) do
    {%{state | lock: ref, timeout: timeout()}, :ok, []}
  end

  def apply(_, {:lock, ref}, %{lock: ref} = state),
    do: {state, :ok, []}

  def apply(_, {:lock, ref}, %{timeout: out} = state) do
    case now() > out do
      true -> {%{state | lock: ref, timeout: timeout()}, :ok, []}
      false ->  {state, :locked, []}
    end
  end

  def apply(_, {:unlock, ref}, %{lock: ref} = state),
    do: {%{state | lock: nil, timeout: nil}, :ok, []}

  def apply(_, {:unlock, _}, state),
    do: {state, :error, []}

  def apply(_, _, state), do: {state, :ok, []}

  def call(msg), do: :ra.process_command(me(), msg)

  def lock(pid) do
    call({:lock, pid})
    |> result()
  end

  def unlock(pid) do
    call({:unlock, pid})
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