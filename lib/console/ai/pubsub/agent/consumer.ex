defmodule Console.AI.PubSub.Agent.Consumer do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.AI.PubSub.Agent.Actionable
  alias Console.AI.Cron

  def handle_event(event) do
    Cron.if_enabled(fn ->
      Actionable.act(event)
    end)
  end
end
