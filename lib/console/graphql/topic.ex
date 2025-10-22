defprotocol Console.GraphQl.Topic do
  @fallback_to_any true
  @spec infer(struct, :create | :update | :delete) :: [{atom, binary}]
  def infer(resource, delta)
end

defimpl Console.GraphQl.Topic, for: Any do
  def infer(_, _), do: []
end

defimpl Console.GraphQl.Topic, for: Console.Schema.Build do
  def infer(%{id: id}, _), do: [build_delta: "builds", build_delta: "builds:#{id}"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.Command do
  def infer(%{build_id: build_id}, _), do: [command_delta: "commands:#{build_id}"]
end

defimpl Console.GraphQl.Topic, for: Kube.Application do
  def infer(_, _), do: [application_delta: "applications"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.Notification do
  def infer(_, _), do: [notification_delta: "notifications"]
end

defimpl Console.GraphQl.Topic, for: Kazan.Apis.Core.V1.Pod do
  def infer(%{metadata: %{namespace: ns, name: name}}, _), do: [pod_delta: "pods:#{ns}:#{name}", pod_delta: "pods"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.RunLog do
  def infer(%{step_id: id}, _), do: [run_logs_delta: "steps:#{id}"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.Pipeline do
  def infer(%{id: id}, _), do: [pipeline_delta: "pipelines:#{id}"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.Service do
  def infer(%{id: id}, _), do: [service_deployment_delta: "services:#{id}"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.AgentMessage do
  def infer(%{agent_run_id: id}, _), do: [agent_message_delta: "agent_runs:msgs:#{id}"]
end
