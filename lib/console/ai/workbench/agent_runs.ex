defmodule Console.AI.Workbench.AgentRuns do
  @moduledoc """
  Tracks coding agent runs spawned directly by the workbench engine.  Each run is backed by a `:coding`
  activity (with `agent_run_id` set), which is awaited via the `:pg` subscription in `Console.AI.Workbench.Activity`
  and resolved with the run's analysis and pull requests once it terminates.
  """
  alias Console.Repo
  alias Console.AI.Workbench.{Activity, Environment}
  alias Console.Deployments.Workbenches
  alias Console.Schema.{AgentRun, AIUsage, WorkbenchJob, WorkbenchJobActivity}

  require EEx

  @tool_name "workbench_coding_agent"

  def tool_name(), do: @tool_name

  @doc """
  Whether an activity is a coding agent run spawned at the engine level that hasn't finished yet,
  eg one orphaned by an engine restart.
  """
  @spec pending?(WorkbenchJobActivity.t()) :: boolean
  def pending?(%WorkbenchJobActivity{
    type: :coding,
    status: status,
    agent_run_id: run_id,
    tool_call: %{name: @tool_name}
  }) when status in [:pending, :running] and is_binary(run_id), do: true
  def pending?(_), do: false

  @doc """
  Blocks until the agent run backing `activity` completes, then persists its result to the activity.
  """
  @spec await(WorkbenchJobActivity.t(), WorkbenchJob.t()) :: {:ok, WorkbenchJobActivity.t()} | Console.error
  def await(%WorkbenchJobActivity{} = activity, %WorkbenchJob{} = job) do
    activity = Repo.preload(activity, [:agent_run])

    Console.safely(fn -> result(activity.agent_run, job) end, &crash_fallback/1)
    |> Workbenches.update_job_activity(activity)
  end

  defp result(%AgentRun{} = run, job) do
    Activity.await_run(run)
    |> preload_run()
    |> record_usage(job)
    |> case do
      {:timeout, %AgentRun{id: id}} ->
        %{status: :failed, result: %{error: "agent run #{id} timed out"}}
      {:failed, %AgentRun{status: :cancelled}} ->
        %{status: :failed, result: %{error: "agent run was cancelled"}}
      {:failed, %AgentRun{error: error}} ->
        %{status: :failed, result: %{error: "agent run failed: #{error}"}}
      {:success, %AgentRun{mode: mode, pull_requests: prs, analysis: analysis}}
        when mode in [:write, :review] and is_list(prs) ->
        successful(analysis_prompt(analysis: analysis, pull_requests: prs))
      {:success, %AgentRun{mode: :analyze, analysis: %AgentRun.Analysis{} = analysis}} ->
        successful(analysis_prompt(pull_requests: nil, analysis: analysis))
      {:success, _} ->
        successful("Agent run completed successfully, but no output was generated")
    end
  end
  defp result(_, _), do: %{status: :failed, result: %{error: "no agent run is associated with this activity"}}

  defp successful(output), do: %{status: :successful, result: %{output: String.trim(output)}}

  defp preload_run({result, %AgentRun{} = run}),
    do: {result, Repo.preload(run, [:pull_requests, :runtime], force: true)}

  defp record_usage({result, %AgentRun{usage: %AIUsage{} = usage} = run} = pass, job)
       when result in [:failed, :success] do
    Environment.runtime_usage_callback(job, run, AIUsage.to_map(usage))
    pass
  end
  defp record_usage(result, _), do: result

  defp crash_fallback(err),
    do: %{status: :failed, result: %{error: "error awaiting coding agent run: #{inspect(err)}"}}

  EEx.function_from_file(:defp, :analysis_prompt, Console.priv_filename(["prompts", "workbench", "coding_output.md.eex"]), [:assigns])
end
