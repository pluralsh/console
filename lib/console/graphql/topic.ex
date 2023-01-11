defprotocol Console.GraphQl.Topic do
  @spec infer(struct, :create | :update | :delete) :: [{atom, binary}]
  def infer(resource, delta)
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
