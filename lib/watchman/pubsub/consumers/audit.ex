defmodule Watchman.PubSub.Consumers.Audit do
  use Piazza.PubSub.Consumer,
    broadcaster: Watchman.PubSub.Broadcaster,
    max_demand: 10
  alias Watchman.Schema.Audit
  alias Watchman.PubSub.Auditable


  def handle_event(event) do
    with %Audit{} = audit <- Auditable.audit(event) do
      audit
      |> Audit.changeset()
      |> Watchman.Repo.insert()
    end
  end
end