defmodule Console.AI.PubSub.Agent.Consumer do
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100,
    protocol: Console.AI.PubSub.Agent.Actionable
  alias Console.AI.PubSub.Agent.Actionable
  alias Console.AI.Cron

  def handle_event(event) do
    Cron.if_enabled(fn ->
      Actionable.act(event)
    end)
  end
end
