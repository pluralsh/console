defmodule Console.PubSub.Consumer do
  defmacro __using__(broadcaster: broadcaster, max_demand: demand, protocol: proto) do
    quote do
      use ConsumerSupervisor
      import Console.PubSub.Consumer
      @proto unquote(proto)
      @any_proto Module.concat(unquote(proto), Any)

      def start_link(arg) do
        ConsumerSupervisor.start_link(__MODULE__, arg)
      end

      def init(_arg) do
        children = [%{id: Console.Consumers.Worker, start: {Console.Consumers.Worker, :start_link, [__MODULE__]}, restart: :temporary}]
        opts = [strategy: :one_for_one, subscribe_to: [{
          unquote(broadcaster),
          max_demand: unquote(demand),
          selector: &implemented(@proto, @any_proto, &1)
        }]]
        ConsumerSupervisor.init(children, opts)
      end
    end
  end

  def implemented(protocol, any_mod, arg) when is_atom(protocol) and is_atom(any_mod) do
    case protocol.impl_for(arg) do
      nil      -> false
      ^any_mod -> false
      _        -> true
    end
  end
  def implemented(_protocol, _any_mod, _arg), do: false
end

defmodule Console.Consumers.Worker do
  def start_link(handler, event) do
    Task.start_link(fn ->
      handler.handle_event(event)
    end)
  end
end
