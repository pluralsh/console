defmodule Console.AI.Workbench.MCP.Client do
  @moduledoc """
  Owns a single Anubis client and transport for `Console.AI.Workbench.MCP.Clients`.

  Transport credentials are fixed when the client starts and tokens expire, so the worker exits
  normally once idle or past its max age.  It's transient, so that exit is final and the next
  caller starts a fresh client, while a crash still gets a restart.
  """
  use GenServer, restart: :transient
  alias Console.AI.Workbench.MCP.Clients

  @idle :timer.minutes(10)
  @max_age :timer.hours(1)
  @check :timer.minutes(1)
  @start_attempts 5
  @stale_wait :timer.seconds(5)
  @registry_settle 10
  # within the supervisor's default 5s shutdown, which would kill the worker mid-stop
  @stop_timeout :timer.seconds(4)

  def start_link({key, fingerprint, opts}) do
    GenServer.start_link(__MODULE__, opts, name: {:via, Registry, {Clients.registry(), {:worker, key}, fingerprint}})
  end

  def touch(pid), do: GenServer.cast(pid, :touch)

  @impl true
  def init(opts) do
    # so shutdowns run terminate/2, stopping the client before a replacement starts
    Process.flag(:trap_exit, true)

    case start_client(opts, @start_attempts) do
      {:ok, client} ->
        :timer.send_interval(@check, :check)
        now = now()
        {:ok, %{client: client, started: now, used: now}}
      {:error, error} -> {:stop, error}
    end
  end

  # A replaced client can still hold its registered names for a moment after its worker is
  # gone (shutdown and registry cleanup are both asynchronous), so wait it out and retry.
  defp start_client(opts, attempts) do
    case {Anubis.Client.start_link(opts), attempts} do
      {{:error, error}, n} when n > 1 ->
        case stale_process(error) do
          pid when is_pid(pid) ->
            await_exit(pid)
            start_client(opts, n - 1)
          _ -> {:error, error}
        end
      {result, _} -> result
    end
  end

  defp stale_process({:already_started, pid}) when is_pid(pid), do: pid
  defp stale_process({:shutdown, {:failed_to_start_child, _, reason}}), do: stale_process(reason)
  defp stale_process(_), do: nil

  defp await_exit(pid) do
    ref = Process.monitor(pid)
    receive do
      {:DOWN, ^ref, :process, ^pid, _} -> :ok
    after @stale_wait -> Process.demonitor(ref, [:flush])
    end
    # the registry drops a dead process's names after it's gone
    Process.sleep(@registry_settle)
  end

  @impl true
  def handle_cast(:touch, state), do: {:noreply, %{state | used: now()}}

  @impl true
  def handle_info(:check, %{started: started, used: used} = state) do
    now = now()
    case now - used >= @idle or now - started >= @max_age do
      true -> {:stop, :normal, state}
      false -> {:noreply, state}
    end
  end
  # trapping exits, so a dead client has to stop the worker itself
  def handle_info({:EXIT, client, reason}, %{client: client} = state), do: {:stop, reason, state}
  def handle_info(_, state), do: {:noreply, state}

  # a normal exit isn't propagated over the link, so the client has to be stopped explicitly
  @impl true
  def terminate(_, %{client: client}) do
    if Process.alive?(client) do
      try do
        Supervisor.stop(client, :normal, @stop_timeout)
      catch
        # it may exit on its own while being stopped
        :exit, _ -> :ok
      end
    end
  end

  defp now(), do: System.monotonic_time(:millisecond)
end
