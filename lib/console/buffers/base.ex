defmodule Console.Buffer.Base do
  def registry(), do: :buffers_registry

  defmacro __using__(opts) do
    lifespan = Keyword.get(opts, :lifespan, 60_000)
    state = Keyword.get(opts, :state, & &1)
    quote do
      use GenServer, restart: :transient
      require Logger

      def start_link(arg, opts \\ []) do
        GenServer.start_link(__MODULE__, arg, name: name(opts[:name]))
      end

      def start(opts \\ []) do
        GenServer.start(__MODULE__, name: name(opts))
      end

      def init(opts) do
        Logger.info "Creating buffer #{__MODULE__}"
        Process.send_after(self(), :flush, unquote(lifespan))
        {:ok, unquote(state).(opts), 0}
      end

      def name(shard), do: {:via, Registry, {Console.Buffer.Base.registry(), {:buffer, shard}}}

      def submit(pid \\ __MODULE__, job), do: GenServer.call(pid, {:submit, job})
    end
  end
end
