defmodule Console.Deployments.PubSub.Binding do
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10,
    protocol: Console.Deployments.PubSub.Bindable

  alias Console.Repo
  alias Console.Schema.{BindingPolicy, Stack, Workbench}
  alias Console.Deployments.Policy
  alias Console.Deployments.PubSub.Bindable

  def handle_event(event) do
    with %{} = target <- Bindable.target(event) do
      BindingPolicy
      |> BindingPolicy.for_type(binding_type(target))
      |> Repo.stream(method: :keyset)
      |> Console.throttle(count: 10, pause: :timer.seconds(1))
      |> Stream.each(&Policy.reconcile(&1, target))
      |> Stream.run()
    end
  end

  defp binding_type(%Workbench{}), do: :workbench
  defp binding_type(%Stack{}), do: :stack
end
