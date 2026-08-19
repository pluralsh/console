defprotocol Console.Deployments.PubSub.Bindable do
  @fallback_to_any true

  @doc "Returns a fully preloaded bindable target for an event."
  @spec target(term) :: Console.Schema.Workbench.t | Console.Schema.Stack.t | :ok
  def target(event)
end

defimpl Console.Deployments.PubSub.Bindable, for: Any do
  def target(_), do: :ok
end

defimpl Console.Deployments.PubSub.Bindable, for: [
  Console.PubSub.WorkbenchCreated,
  Console.PubSub.WorkbenchUpdated
] do
  alias Console.Repo
  alias Console.Schema.Workbench

  def target(%@for{item: %Workbench{id: id}}),
    do: Repo.get(Workbench.preloaded(), id) || :ok
  def target(_), do: :ok
end

defimpl Console.Deployments.PubSub.Bindable, for: [
  Console.PubSub.StackCreated,
  Console.PubSub.StackUpdated
] do
  alias Console.Repo
  alias Console.Schema.Stack

  def target(%@for{item: %Stack{id: id}}),
    do: Repo.get(Stack.preloaded([:project]), id) || :ok
  def target(_), do: :ok
end
