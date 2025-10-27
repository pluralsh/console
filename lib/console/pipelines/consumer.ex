defmodule Console.Pipelines.Consumer do
  @moduledoc """
  A consumer for pipelines.
  """
  @callback handle_event(event :: any()) :: any()

  defmodule Runner do
    def start_link(handler, event) do
      Task.start_link(fn ->
        handler.handle_event(event)
      end)
    end
  end


  defmacro __using__(opts) do
    demand = Keyword.get(opts, :demand, 50)

    quote do
      use ConsumerSupervisor
      alias Console.Pipelines.Consumer.Runner

      @behaviour Console.Pipelines.Consumer

      def start_link(producer) do
        ConsumerSupervisor.start_link(__MODULE__, producer)
      end

      def init(producer) do
        children = [%{id: Runner, start: {Runner, :start_link, [__MODULE__]}, restart: :temporary}]
        opts = [strategy: :one_for_one, subscribe_to: [{producer, max_demand: unquote(demand)}]]
        ConsumerSupervisor.init(children, opts)
      end
    end
  end
end
