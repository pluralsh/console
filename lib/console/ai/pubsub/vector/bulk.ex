defmodule Console.AI.PubSub.Vector.Bulk do
  alias Console.AI.PubSub.Vector.Consumer
  alias Console.AI.PubSub.Vectorizable
  alias Console.PubSub

  alias Console.Schema.{
    Catalog,
    PrAutomation,
    Stack,
    WorkbenchJob
  }

  def insert(object) do
    to_event(object)
    |> Vectorizable.resource()
    |> Consumer.insert()
  end

  def to_event(%Catalog{} = catalog), do: %PubSub.CatalogCreated{item: catalog}
  def to_event(%PrAutomation{} = pr), do: %PubSub.PrAutomationCreated{item: pr}
  def to_event(%Stack{} = stack), do: %PubSub.StackUpdated{item: stack}
  def to_event(%WorkbenchJob{} = job), do: %PubSub.WorkbenchJobUpdated{item: job}
  def to_event(_), do: :ok
end
