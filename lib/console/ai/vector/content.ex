defmodule Console.AI.Vector.Content do
  alias Console.AI.Vector.Storable
  alias Console.AI.VectorStore.Response
  alias Console.Deployments.Pr.File
  alias Console.Schema.{AlertResolution, StackState, ServiceComponent, PrAutomation, Catalog}

  def content(data), do: {Storable.id(data), Storable.datatype(data), Storable.content(data)}

  def decode("pr_file", data), do: %Response{type: :pr, pr_file: File.new(data)}
  def decode(:pr_file, data), do: %Response{type: :pr, pr_file: File.new(data)}

  def decode("alert_resolution", data), do: %Response{type: :alert,alert_resolution: AlertResolution.Mini.new(data)}
  def decode(:alert_resolution, data), do: %Response{type: :alert, alert_resolution: AlertResolution.Mini.new(data)}

  def decode("stack_state", data), do: %Response{type: :stack, stack_state: StackState.Mini.new(data)}
  def decode(:stack_state, data), do: %Response{type: :stack, stack_state: StackState.Mini.new(data)}

  def decode("service_component", data), do: %Response{type: :service, service_component: ServiceComponent.Mini.new(data)}
  def decode(:service_component, data), do: %Response{type: :service, service_component: ServiceComponent.Mini.new(data)}

  def decode("pr_automation", data), do: %Response{type: :pr_automation, pr_automation: PrAutomation.Mini.new(data)}
  def decode(:pr_automation, data), do: %Response{type: :pr_automation, pr_automation: PrAutomation.Mini.new(data)}

  def decode("catalog", data), do: %Response{type: :catalog, catalog: Catalog.Mini.new(data)}
  def decode(:catalog, data), do: %Response{type: :catalog, catalog: Catalog.Mini.new(data)}

  def decode(_, _), do: nil
end
