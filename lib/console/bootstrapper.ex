defmodule Console.Bootstrapper do
  use GenServer
  alias Console.Commands.{Tee, Command}
  alias ETS.KeyValueSet
  require Logger

  @table :console_bootstrapper

  defmodule State, do: defstruct [:storage, :ref, :output, :cloned, :table]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    Process.flag(:trap_exit, true)
    if Console.conf(:initialize) do
      send self(), :migrate
    end

    write_token_file!()

    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    # send self(), :cluster
    {:ok, %State{storage: Console.storage(), ref: make_ref(), table: table}}
  end

  def kick(), do: GenServer.cast(__MODULE__, :start)

  def git_enabled?() do
    case {status(), Console.conf(:initialize)} do
      {%{cloned: true}, _} -> true
      {_, true} -> false
      _ -> true
    end
  end

  def status() do
    with {:ok, table} <- KeyValueSet.wrap_existing(@table),
         [_ | _] = set <- KeyValueSet.to_list!(table) do
      Map.new(set)
    else
      _ -> %{cloned: false, output: ""}
    end
  end

  def handle_call(:status, _, %State{cloned: cloned, output: output} = state),
    do: {:reply, %{cloned: cloned, output: output}, state}

  def handle_info(:migrate, state) do
    with {:error, err} <- Console.Deployments.Settings.migrate_agents(),
      do: Logger.info("didn't migrate agents due to: #{inspect(err)}")
    {:noreply, state}
  end

  def handle_info(:init, %State{storage: storage, table: table} = state) do
    tee = Tee.new()
    Command.set_build(tee)
    case storage.init() do
      {:ok, _} ->
        {:noreply, %{state | cloned: true, output: "", table: flush(table, %{cloned: true, output: ""})}}
      {:error, out} ->
        Process.send_after(self(), :init, 10_000)
        table = flush(table, %{cloned: false, output: Tee.output(out)})
        {:noreply, %{state | cloned: false, output: Tee.output(out), table: table}}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  defp flush(table, state) do
    Enum.reduce(state, table, fn {k, v}, t -> KeyValueSet.put!(t, k, v) end)
  end

  defp write_token_file!() do
    Path.join(Console.conf(:sidecar_token_path), "token")
    |> File.write!(Console.conf(:sidecar_token))
  end
end
