defmodule Watchman.Watchers.Base do
  import Watchman.Services.Base

  defmacro __using__(opts) do
    state_keys = Keyword.get(opts, :state, [:pid]) |> Enum.concat([:timer])
    quote do
      use GenServer
      import Watchman.Watchers.Base
      alias Kazan.Watcher
      require Logger

      defmodule State, do: defstruct unquote(state_keys)

      def start_link(opts \\ :ok) do
        GenServer.start_link(__MODULE__, opts)
      end

      def init(_) do
        :pg2.create(__MODULE__)
        :pg2.join(__MODULE__, self())
        send self(), :elect
        {:ok, %State{}}
      end

      def handle_call(:state, _, state), do: {:reply, state, state}
      def handle_call({:swarm, :begin_handoff}, _from, state), do: {:reply, :restart, state}
      def handle_call(:ping, _, state), do: {:reply, :pong, state}

      def handle_cast({:swarm, :end_handoff, _}, state), do: {:noreply, state}

      def handle_cast({:swarm, :resolve_conflict, _delay}, state),
        do: {:noreply, state}

      def handle_info(:elect, state) do
        me = self()
        {leader, cert} = :evel.elect(__MODULE__, me)
        Logger.info "Beginning leader election for #{__MODULE__}, leader=#{inspect(leader)}, proc=#{inspect(me)}, cert=#{inspect(cert)}"
        Process.link(cert)
        group_broadcast(__MODULE__, {:leader, leader, cert})
        case leader == me do
          true ->
            Logger.info "proc=#{inspect(me)}, cert=#{inspect(cert)} Assuming leadership for #{__MODULE__}"
            send me, :start
            {:ok, ref} = :timer.send_interval(5000, :ping)
            {:noreply, %{state | timer: ref}}
          _ -> {:noreply, state}
        end
      end

      def handle_info({:leader, _, cert}, %{timer: nil} = state) do
        Process.link(cert)
        {:noreply, state}
      end

      def handle_info({:leader, leader, cert}, %{timer: timer} = state) do
        Process.link(cert)
        case leader == self() do
          true -> {:noreply, state}
          _ ->
            {:ok, _} = :timer.cancel(timer)
            {:noreply, %{state | timer: nil}}
        end
      end

      def handle_info(:ping, state) do
        Logger.info "received ping for #{__MODULE__} pid=#{inspect(self())} node=#{node()}"
        {:noreply, state}
      end

      def handle_info({:DOWN, _, :process, _, _}, state) do
        {:noreply, state}
      end

      def handle_info({:swarm, :die}, state) do
        {:stop, :shutdown, state} # would be good to record last resource version here
      end
    end
  end

  def to_delta(:added), do: :create
  def to_delta(:modified), do: :update
  def to_delta(:deleted), do: :delete

  def publish(resource, type) do
    broadcast(resource, to_delta(type))
  end

  def group_broadcast(group, msg) do
    :pg2.get_members(group)
    |> Enum.filter(& &1 != self())
    |> Enum.each(&send(&1, msg))
  end
end
