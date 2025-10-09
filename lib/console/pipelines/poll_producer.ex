defmodule Console.Pipelines.PollProducer do
  @moduledoc """
  Base implementation for a pipeline producer.  This basically does the following:

  * poll every 15s, delegating to the using modules poll/1 function, for new records
  * append those records to an internal buffer, filtering out ones that can't be processed on this node and deduping by id
  * deliver the records to the pipeline, in batches of demand, either on poll or when demand is sent upstream
  """
  require Logger

  defmodule State, do: defstruct [demand: 0, buffer: []]

  @callback poll(integer) :: [%{id: binary}]

  defmacro __using__(opts) do
    interval = Keyword.get(opts, :interval, :timer.seconds(15))

    quote do
      use GenStage
      import Console.Pipelines.PollProducer
      import Console.Pipelines.Base
      alias Console.Repo
      alias Console.Pipelines.PollProducer.State
      require Logger

      @behaviour Console.Pipelines.PollProducer

      @poll_interval unquote(interval)
      @gc_interval :timer.minutes(60)

      def start_link(opts \\ []) do
        GenStage.start_link(__MODULE__, opts, name: __MODULE__)
      end

      def init(_) do
        :timer.send_interval(@poll_interval, :poll)
        send_gc()
        {:producer, %State{}}
      end

      def handle_info(:poll, %State{demand: demand} = state) do
        events = poll(min(demand, 30))
        Logger.info "poll success for #{__MODULE__}: #{length(events)} events"
        ingest(events, state)
        |> deliver()
      end

      def handle_info(:gc, state) do
        :erlang.garbage_collect()
        send_gc()
        {:noreply, [], state}
      end

      def handle_info(_, state), do: {:noreply, [], state}

      def handle_demand(demand, %State{demand: remaining} = state) when demand > 0 do
        deliver(%{state | demand: demand + remaining})
      end
      def handle_demand(_, state), do: deliver(state)

      defp send_gc() do
        Process.send_after(self(), :gc, @gc_interval + Console.jitter(@gc_interval))
      end
    end
  end

  def empty(state), do: {:noreply, [], state}

  def ingest([_ | _] = events, %State{buffer: buffer} = state) when is_list(buffer) do
    buffer = Enum.uniq_by(buffer ++ Enum.filter(events, &local?/1), & &1.id)
    %{state | buffer: buffer}
  end
  def ingest(_, state), do: state

  def deliver(%State{buffer: buffer, demand: demand} = state) do
    {events, buffer} = Enum.split(buffer, demand)
    {:noreply, events, %{state | buffer: buffer, demand: demand - length(events)}}
  end

  defp worker_node(id), do: HashRing.Managed.key_to_node(:cluster, id)

  defp local?(%{id: id}), do: worker_node(id) == node()
end
