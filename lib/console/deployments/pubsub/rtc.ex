## I need to find a way to provide authorization for this that's not a major perf drag

defimpl Console.PubSub.Rtc, for: [Console.PubSub.RunLogsCreated] do
  def deliver(%{item: item}), do: {item, :create}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.RunStepUpdated do
  def deliver(%{item: step}), do: {step, :update}
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

# service deltas are authorized per subscriber on delivery and component updates fire on every agent
# sync, so the policy graph is attached once here, mostly from cache
defimpl Console.PubSub.Rtc, for: Console.PubSub.ServiceCreated do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: svc}), do: {Rbac.cached_preload(svc), :create}
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.ServiceUpdated,
  Console.PubSub.ServiceComponentsUpdated,
] do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: svc}), do: {Rbac.cached_preload(svc), :update}
end

# soft deletes only schedule a drain, while detaching removes the row immediately
defimpl Console.PubSub.Rtc, for: Console.PubSub.ServiceDeleted do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: %{__meta__: %{state: :deleted}} = svc}), do: {Rbac.cached_preload(svc), :delete}
  def deliver(%{item: svc}), do: {Rbac.cached_preload(svc), :update}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.ServiceHardDeleted do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: svc}), do: {Rbac.cached_preload(svc), :delete}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.ClusterCreated do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: cluster}), do: {Rbac.cached_preload(cluster), :create}
end

defimpl Console.PubSub.Rtc, for: [Console.PubSub.ClusterUpdated, Console.PubSub.ClusterPinged] do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: cluster}), do: {Rbac.cached_preload(cluster), :update}
end

# soft deletes only schedule a drain, while detaching or deleting a virtual cluster removes the row immediately
defimpl Console.PubSub.Rtc, for: Console.PubSub.ClusterDeleted do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: %{__meta__: %{state: :deleted}} = cluster}), do: {Rbac.cached_preload(cluster), :delete}
  def deliver(%{item: cluster}), do: {Rbac.cached_preload(cluster), :update}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.AgentMessageUpdated do
  def deliver(%{item: message}), do: {message, :update}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.AgentMessageCreated do
  def deliver(%{item: message}), do: {message, :create}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.AgentRunUpdated do
  def deliver(%{item: run}), do: {run, :update}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.WorkbenchJobCreated do
  def deliver(%{item: job}), do: {job, :create}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.WorkbenchJobUpdated do
  def deliver(%{item: job}), do: {job, :update}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.WorkbenchJobActivityCreated do
  def deliver(%{item: activity}), do: {activity, :create}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.WorkbenchJobActivityUpdated do
  def deliver(%{item: activity}), do: {activity, :update}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.WorkbenchJobThoughtCreated do
  def deliver(%{item: thought}), do: {thought, :create}
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.DashboardCreated,
  Console.PubSub.MonitorCreated,
] do
  def deliver(%{item: item}), do: {item, :create}
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.DashboardUpdated,
  Console.PubSub.MonitorUpdated,
] do
  def deliver(%{item: item}), do: {item, :update}
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.DashboardDeleted,
  Console.PubSub.MonitorDeleted,
] do
  def deliver(%{item: item}), do: {item, :delete}
end

# stack deltas are authorized per subscriber on delivery, so preload the full policy graph once here
defimpl Console.PubSub.Rtc, for: Console.PubSub.StackCreated do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: stack}), do: {Rbac.preload(stack), :create}
end

defimpl Console.PubSub.Rtc, for: [Console.PubSub.StackUpdated, Console.PubSub.StackDeleted] do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: stack}), do: {Rbac.preload(stack), :update}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.StackDetached do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: stack}), do: {Rbac.preload(stack), :delete}
end

# runs write their stack on every status change, so its delta is authorized from the cached policy graph
defimpl Console.PubSub.Rtc, for: Console.PubSub.StackStatusChanged do
  alias Console.Deployments.Policies.Rbac
  def deliver(%{item: stack}), do: {Rbac.cached_preload(stack), :update}
end

# run subscribers were authorized against the run's stack when subscribing, so runs need no preloads
defimpl Console.PubSub.Rtc, for: Console.PubSub.StackRunCreated do
  def deliver(%{item: run}), do: {run, :create}
end

defimpl Console.PubSub.Rtc, for: [Console.PubSub.StackRunUpdated, Console.PubSub.StackRunCompleted] do
  def deliver(%{item: run}), do: {run, :update}
end

defimpl Console.PubSub.Rtc, for: Console.PubSub.AgentMessageStdoutCreated do
  def deliver(%{item: stdout}), do: {stdout, :create}
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
