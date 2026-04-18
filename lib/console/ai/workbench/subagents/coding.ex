defmodule Console.AI.Workbench.Subagents.Coding do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, AgentRun, PullRequest}
  alias Console.AI.Tools.Workbench.{Skills, Skill, CodingAgent, Result}
  alias Console.Deployments.Workbenches
  alias Console.AI.Workbench.Environment

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt}, %Environment{} = environment) do
    tools(environment)
    |> MemoryEngine.new(20, system_prompt: String.trim(system_prompt(prompt: jprompt)), acc: %{}, callback: &callback(activity, &1))
    |> MemoryEngine.reduce([{:user, prompt}], &reducer(activity, &1, &2))
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running infrastructure subagent: #{inspect(error)}"}}
    end
  end

  defp reducer(activity, messages, _) do
    case Enum.find(messages, &stop_msg/1) do
      %AgentRun{} = run -> {:message, persist_and_poll_run(activity, run)}
      %Result{output: output} -> {:halt, %{status: :successful, result: %{output: output}}}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp stop_msg(%AgentRun{}), do: true
  defp stop_msg(%Result{}), do: true
  defp stop_msg(_), do: false

  defp persist_and_poll_run(activity, %AgentRun{id: id} = run) do
    Workbenches.associate_agent_run(activity, id)

    case poll_run(run) do
      {:timeout, _} -> {:user, "agent run #{id} timed out"}
      {:failed, %AgentRun{error: error}} -> {:user, "Agent run failed: #{error}"}
      {:success, %AgentRun{mode: :write, pull_requests: [_ | _] = prs}} ->
        mark_prs(prs, activity)
        tool_msg(String.trim(analysis_prompt(analysis: nil, pull_requests: prs)), run)
      {:success, %AgentRun{mode: :analyze, analysis: %AgentRun.Analysis{} = analysis}} ->
        tool_msg(String.trim(analysis_prompt(pull_requests: nil, analysis: analysis)), run)
      {:success, _} -> {:user, "Agent run completed successfully, but no output was generated"}
    end
  end

  defp tool_msg(content, %AgentRun{tool: %Console.AI.Tool{id: id, name: name, arguments: args}}),
    do: {:tool, content, %{call_id: id, name: name, arguments: args}}
  defp tool_msg(content, _), do: {:user, content}

  defp mark_prs(prs, %WorkbenchJobActivity{workbench_job_id: id}) do
    Enum.map(prs, & &1.id)
    |> PullRequest.for_ids()
    |> Repo.update_all(set: [workbench_job_id: id])
  end

  defp tools(%Environment{skills: skills, job: job}) do
    [
      %CodingAgent{workbench: job.workbench},
      %Skills{skills: skills},
      %Skill{skills: skills},
      Result
    ]
  end

  EEx.function_from_file(:defp, :analysis_prompt, Console.priv_filename(["prompts", "workbench", "coding_output.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "coding.md.eex"]), [:assigns])
end
