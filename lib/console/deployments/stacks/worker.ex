defmodule Console.Deployments.Stacks.Worker do
  use GenServer, restart: :transient
  alias Console.Repo
  alias Console.Schema.StackRun
  alias Console.Deployments.{Stacks, Metrics.Provider}

  require Logger

  @poll :timer.minutes(1)

  defmodule State, do: defstruct [:run, :bot]

  def registry(), do: __MODULE__

  def start_link([%StackRun{} = run]), do: start_link(run)
  def start_link(%StackRun{} = run) do
    GenServer.start_link(__MODULE__, run, name: via(run))
  end

  def init(run) do
    :timer.send_interval(@poll, :poll)
    :timer.send_interval(@poll, :move)
    send self(), :poll
    bot = Console.Services.Users.get_bot!("console")
    {:ok, %State{run: run, bot: %{bot | roles: %{admin: true}}}}
  end

  def ping(pid), do: GenServer.call(pid, :ping)

  defp via(%StackRun{id: id}), do: {:via, Registry, {registry(), {:stack, id}}}

  def handle_call(:ping, _, state), do: {:reply, :pong, state}

  def handle_info(:poll, %State{run: run, bot: bot} = state) do
    %{stack: %{observable_metrics: metrics}} = run = Repo.preload(run, [stack: :observable_metrics], force: true)
    Logger.info "starting to watch metrics for run #{run.id}"
    case maybe_cancel_run(metrics, run, bot) do
      {:ok, run} -> {:stop, {:shutdown, :normal}, %{state | run: run}}
      {:error, err} ->
        Logger.error "failed to cancel stack run: #{inspect(err)}"
        {:noreply, state}
      :ok -> {:noreply, state}
    end
  end

  def handle_info(:move, %State{run: run} = state) do
    case Stacks.Discovery.local?(run) do
      true -> {:noreply, state}
      false -> {:stop, {:shutdown, :moved}, state}
    end
  end

  defp maybe_cancel_run(_, %StackRun{status: status}, _) when status in [:successful, :failed, :cancelled],
    do: {:ok, :finished}
  defp maybe_cancel_run(metrics, run, bot) do
    Enum.find_value(metrics, fn metric ->
      case Provider.query(metric) do
        {:error, {:client, err}} ->
          Logger.warning "failed to query metric #{metric.identifier}: #{inspect(err)}"
          nil
        {:error, _} = error -> error
        :ok -> nil
      end
    end)
    |> case do
      {:error, reason} ->
        Stacks.complete_stack_run(%{
          status: :cancelled,
          cancellation_reason: reason
        }, run.id, bot)
      _ -> :ok
    end
  end
end
