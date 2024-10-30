defmodule Console.AI.PubSub.Consumer do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.AI.{PubSub.Insightful, Cron}
  require Logger

  def handle_event(event) do
    Cron.if_enabled(fn ->
      with {:ok, res} <- Insightful.resource(event) do
        Logger.info "attempting to capture insight for #{res.__struct__}{id: #{res.id}}"
        Console.AI.Memoizer.generate(res)
      end
    end)
  end
end
