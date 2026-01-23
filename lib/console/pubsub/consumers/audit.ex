defmodule Console.PubSub.Consumers.Audit do
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100,
    protocol: Console.PubSub.Auditable
  alias Console.Schema.{Audit, AuditContext}
  alias Console.PubSub.Auditable


  def handle_event(event) do
    with %Audit{} = audit <- Auditable.audit(event) do
      audit
      |> Audit.changeset(context(event))
      |> Console.Repo.insert()
    end
  end

  defp context(%{context: %AuditContext{} = ctx}), do: Map.from_struct(ctx)
  defp context(_), do: %{}
end
