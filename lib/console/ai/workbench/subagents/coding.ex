defmodule Console.AI.Workbench.Subagents.Coding do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, AgentRun}
  alias Console.AI.Tools.Workbench.{
    Skills,
    History,
    Skill,
    Scratchpad,
    CodingAgent,
    Result,
    Coding.PullRequests
  }
  alias Console.AI.Workbench.Environment

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt}, %Environment{} = environment) do
    tools(activity, environment)
    |> MemoryEngine.new(20,
      system_prompt: String.trim(system_prompt(prompt: jprompt)),
      acc: %{},
      callback: &callback(activity, &1),
      continue_msg: cont_msg()
    )
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running infrastructure subagent: #{inspect(error)}"}}
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &stop_msg/1) do
      %AgentRun{} = run -> {:message, persist_and_poll_run(run)}
      %Result{output: output} -> {:halt, %{status: :successful, result: %{output: output}}}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp stop_msg(%AgentRun{}), do: true
  defp stop_msg(%Result{}), do: true
  defp stop_msg(_), do: false

  defp persist_and_poll_run(%AgentRun{id: id} = run) do
    case poll_run(run) do
      {:timeout, _} -> {:user, "agent run #{id} timed out"}
      {:failed, %AgentRun{error: error}} -> {:user, "Agent run failed: #{error}"}
      {:success, %AgentRun{mode: :write, pull_requests: [_ | _] = prs, analysis: analysis}} ->
        tool_msg(String.trim(analysis_prompt(analysis: analysis, pull_requests: prs)), run)
      {:success, %AgentRun{mode: :analyze, analysis: %AgentRun.Analysis{} = analysis}} ->
        tool_msg(String.trim(analysis_prompt(pull_requests: nil, analysis: analysis)), run)
      {:success, _} -> {:user, "Agent run completed successfully, but no output was generated"}
    end
  end

  defp tool_msg(content, %AgentRun{tool: %Console.AI.Tool{id: id, name: name, arguments: args}}),
    do: {:tool, content, %{call_id: id, name: name, arguments: args}}
  defp tool_msg(content, _), do: {:user, content}

  defp tools(activity, %Environment{skills: skills, job: job, activities: activities}) do
    [
      %CodingAgent{activity: activity, workbench: job.workbench},
      %PullRequests{job: job},
      %Skills{skills: Environment.subagent_skills(skills, :coding)},
      %Skill{skills: Environment.subagent_skills(skills, :coding)},
      Scratchpad,
      %History{job: job, activities: activities},
      Result
    ]
  end

  EEx.function_from_file(:defp, :analysis_prompt, Console.priv_filename(["prompts", "workbench", "coding_output.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "coding.md.eex"]), [:assigns])
end
