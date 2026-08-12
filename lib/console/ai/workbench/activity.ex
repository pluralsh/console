defmodule Console.AI.Workbench.Activity do
  @moduledoc false

  alias Console.Schema.{AgentRun, WorkbenchJobActivity}

  @timeout :timer.hours(4)
  defmodule Subscription do
    @enforce_keys [:id, :group, :topic, :timeout]
    defstruct [:id, :group, :topic, :timeout]
  end

  @spec publish(WorkbenchJobActivity.t() | AgentRun.t()) :: :ok
  def publish(%WorkbenchJobActivity{id: id} = activity) when is_binary(id) do
    :pg.get_members(group(id))
    |> Enum.each(&send(&1, {:wb_activity, activity}))
  end
  def publish(%AgentRun{id: id} = run) when is_binary(id) do
    :pg.get_members(agent_group(id))
    |> Enum.each(&send(&1, {:wb_agent, run}))
  end

  @spec await_activity(WorkbenchJobActivity.t(), timeout()) ::
          {:ok, WorkbenchJobActivity.t()} | {:error, binary()}
  def await_activity(%WorkbenchJobActivity{} = activity, timeout \\ @timeout) do
    activity
    |> subscribe(timeout)
    |> await(&completed_activity?/1)
    |> case do
      {:completed, activity} -> {:ok, activity}
      :timeout -> {:error, "activity timed out waiting for approval or completion"}
    end
  end

  @spec await_run(AgentRun.t(), timeout()) :: {:failed | :success | :timeout, AgentRun.t()}
  def await_run(%AgentRun{} = run, timeout \\ @timeout) do
    run
    |> subscribe(timeout)
    |> await(&completed_run?/1)
    |> case do
      {:completed, %AgentRun{status: status} = run} when status in [:failed, :cancelled] -> {:failed, run}
      {:completed, run} -> {:success, run}
      :timeout -> {:timeout, run}
    end
  end

  defp subscribe(%WorkbenchJobActivity{id: id}, timeout) when is_binary(id) do
    group = group(id)
    :ok = :pg.join(group, self())
    %Subscription{id: id, group: group, topic: :wb_activity, timeout: timeout}
  end
  defp subscribe(%AgentRun{id: id}, timeout) when is_binary(id) do
    group = agent_group(id)
    :ok = :pg.join(group, self())
    %Subscription{id: id, group: group, topic: :wb_agent, timeout: timeout}
  end

  defp await(%Subscription{} = subscription, completed?) do
    try do
      do_await(subscription, completed?)
    after
      :ok = :pg.leave(subscription.group, self())
    end
  end

  defp do_await(%Subscription{id: id, topic: topic, timeout: timeout} = subscription, completed?) do
    receive do
      {^topic, %{id: ^id} = updated} ->
        if completed?.(updated), do: {:completed, updated}, else: do_await(subscription, completed?)
    after
      timeout -> :timeout
    end
  end

  defp group(id), do: {:wb_activity, id}
  defp agent_group(id), do: {:wb_agent, id}

  defp completed_activity?(%WorkbenchJobActivity{status: status}),
    do: status in [:successful, :failed, :cancelled, :rejected]

  defp completed_run?(%AgentRun{mode: :write, status: status, pull_requests: [_ | _]})
    when status in [:successful, :babysitting, :failed, :cancelled], do: true
  defp completed_run?(%AgentRun{mode: :analyze, analysis: %AgentRun.Analysis{}}), do: true
  defp completed_run?(%AgentRun{status: status}), do: status in [:successful, :babysitting, :failed, :cancelled]
end
