defmodule Console.PubSub.Consumers.Audit do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.Schema.Audit
  alias Console.PubSub.Auditable


  def handle_event(event) do
    with %Audit{} = audit <- Auditable.audit(event) do
      audit
      |> Audit.changeset()
      |> Console.Repo.insert()
    end
  end
end
