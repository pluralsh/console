## I need to find a way to provide authorization for this that's not a major perf drag

defimpl Console.PubSub.Rtc, for: [Console.PubSub.RunLogsCreated] do
  def deliver(%{item: item}), do: {item, :create}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.PipelineStageUpdated do
  def deliver(%{item: stage}) do
    %{pipeline: pipeline} = Console.Repo.preload(stage, [:pipeline])
    {pipeline, :update}
  end
end

defimpl Console.PubSub.Rtc, for: [Console.PubSub.PipelineGateUpdated, Console.PubSub.PipelineGateApproved] do
  def deliver(%{item: edge}) do
    case Console.Repo.preload(edge, [edge: [from: :pipeline]]) do
      %{edge: %{from: %{pipeline: pipeline}}} -> {pipeline, :update}
      _ -> :ok
    end
  end
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.ServiceUpdated,
  Console.PubSub.ServiceComponentsUpdated,
] do
  def deliver(%{item: item}), do: {item, :update}
end

defimpl Console.PubSub.Rtc, for: [Console.PubSub.AgentMessageCreated] do
  def deliver(%{item: message}), do: {message, :create}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.AgentRunUpdated do
  def deliver(%{item: run}), do: {run, :update}
end

# defimpl Console.PubSub.Rtc, for: [
#   Console.PubSub.ServiceCreated,
#   Console.PubSub.ServiceDeleted,
#   Console.PubSub.ClusterCreated,
#   Console.PubSub.ClusterDeleted,
#   Console.PubSub.ProviderCreated,
#   Console.PubSub.GitRepositoryCreated
# ] do
#   def deliver(%{item: item}), do: {item, :create}
# end
