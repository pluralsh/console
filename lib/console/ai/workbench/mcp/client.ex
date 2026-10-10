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

  def start_link({key, fingerprint, opts}) do
    GenServer.start_link(__MODULE__, opts, name: {:via, Registry, {Clients.registry(), {:worker, key}, fingerprint}})
  end

  def touch(pid), do: GenServer.cast(pid, :touch)

  @impl true
  def init(opts) do
    case Anubis.Client.start_link(opts) do
      {:ok, client} ->
        :timer.send_interval(@check, :check)
        now = now()
        {:ok, %{client: client, started: now, used: now}}
      {:error, error} -> {:stop, error}
    end
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
  def handle_info(_, state), do: {:noreply, state}

  # a normal exit isn't propagated over the link, so the client has to be stopped explicitly
  @impl true
  def terminate(_, %{client: client}) do
    if Process.alive?(client), do: Supervisor.stop(client)
  end

  defp now(), do: System.monotonic_time(:millisecond)
end
