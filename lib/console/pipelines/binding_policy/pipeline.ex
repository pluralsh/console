defmodule Console.Pipelines.BindingPolicy.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Deployments.Policy

  def handle_event(binding) do
    try do
      Policy.reconcile(binding)
    after
      Policy.next_binding_poll(binding)
    end
  end
end
