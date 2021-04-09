defmodule Watchman.Watchers.Base do
  import Watchman.Services.Base

  defmacro __using__(opts) do
    state_keys = Keyword.get(opts, :state, [:pid])
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
        if leader == me do
          send me, :start
          :timer.send_interval(5000, :ping)
        end
        {:noreply, state}
      end

      def handle_info(:ping, state) do
        Logger.info "received ping for #{__MODULE__} pid=#{inspect(self())}"
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
end
