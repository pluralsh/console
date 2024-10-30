defmodule Console.AI.PubSub.Consumer do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  import Console.Services.Base, only: [handle_notify: 2]
  alias Console.PubSub
  alias Console.Schema.{AiInsight, Service, Stack}
  alias Console.AI.{PubSub.Insightful, Cron}
  require Logger

  def handle_event(event) do
    Cron.if_enabled(fn ->
      with {:ok, res} <- Insightful.resource(event) do
        Logger.info "attempting to capture insight for #{res.__struct__}{id: #{res.id}}"
        Console.AI.Memoizer.generate(res)
        |> maybe_send_event()
      end
    end)
  end

  def maybe_send_event({:ok, insight} = res) do
    case Console.Repo.preload(insight, [:stack, :service]) do
      %AiInsight{service: %Service{} = svc} ->
        handle_notify(PubSub.ServiceInsight, {svc, insight})
      %AiInsight{stack: %Stack{} = stack} ->
        handle_notify(PubSub.StackInsight, {stack, insight})
      _ -> :ok
    end
    res
  end
end
