defmodule Console.Deployments.Observer.Worker do
  use GenServer, restart: :transient
  alias Console.Schema.Observer
  alias Console.Deployments.Observer.{Runner, Discovery}

  require Logger

  @poll :timer.minutes(1)

  defmodule State, do: defstruct [:observer]

  def registry(), do: __MODULE__

  def start_link([%Observer{} = obs]), do: start_link(obs)
  def start_link(%Observer{} = obs) do
    GenServer.start_link(__MODULE__, obs, name: via(obs))
  end

  def init(observer) do
    :timer.send_interval(@poll, :poll)
    :timer.send_interval(@poll, :move)
    send self(), :poll
    {:ok, %State{observer: observer}}
  end

  def ping(pid), do: GenServer.call(pid, :ping)

  defp via(%Observer{id: id}), do: {:via, Registry, {registry(), {:observer, id}}}

  def handle_call(:ping, _, state), do: {:reply, :pong, state}

  def handle_info(:poll, %State{observer: %Observer{next_run_at: at} = observer} = state) do
    Logger.info "running observer #{observer.name}"
    with {:at, true} <- {:at, Timex.after?(Timex.now(), at)},
         {:ok, observer} <- Runner.run(refetch(observer)) do
      Logger.info "ran observer #{observer.name}"
      {:noreply, %{state | observer: observer}}
    else
      {:at, _} ->
        Logger.info "cannot run observer #{observer.name} yet, next run at #{inspect(observer.next_run_at)}"
        {:noreply, state}
      {:error, err} ->
        Logger.warning "failed to run observer #{observer.name}, error: #{inspect(err)}"
        {:noreply, state}
    end
  end

  def handle_info(:move, %State{observer: observer} = state) do
    case Discovery.local?(observer) do
      true -> {:noreply, state}
      false -> {:stop, {:shutdown, :moved}, state}
    end
  end

  defp refetch(%Observer{id: id}), do: Console.Repo.get(Observer, id)
end
