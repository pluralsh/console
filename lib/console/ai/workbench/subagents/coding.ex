defmodule Console.AI.Workbench.Subagents.Coding do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, AgentRun, AIUsage}
  alias Console.AI.Tools.Workbench.{
    Skills,
    History,
    Skill,
    Scratchpad,
    CodingAgent,
    Result,
    Coding.PullRequests
  }
  alias Console.AI.Workbench.{Environment, Heartbeat}
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt} = job, %Environment{} = environment) do
    tools(activity, environment)
    |> MemoryEngine.new(20,
      engine_opts(job) ++ [
        system_prompt: String.trim(system_prompt(prompt: jprompt)),
        acc: %{},
        callback: &callback(activity, &1),
        continue_msg: cont_msg()
      ]
    )
    |> MemoryEngine.reduce([{:user, prompt}], &reducer(&1, &2, job))
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running infrastructure subagent: #{inspect(error)}"}}
    end
  end

  defp reducer(messages, _, job) do
    case Enum.find(messages, &stop_msg/1) do
      %AgentRun{} = run -> {:message, persist_and_poll_run(run, job)}
      %Result{output: output} -> {:halt, %{status: :successful, result: %{output: output}}}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp stop_msg(%AgentRun{}), do: true
  defp stop_msg(%Result{}), do: true
  defp stop_msg(_), do: false

  defp persist_and_poll_run(%AgentRun{id: id, tool: tool} = run, job) do
    poll_run(run)
    |> record_usage(job)
    |> case do
      {:timeout, _} -> {:user, "agent run #{id} timed out"}
      {:failed, %AgentRun{error: error}} -> tool_msg("Agent run failed: #{error}", tool)
      {:success, %AgentRun{mode: :write, pull_requests: prs, analysis: analysis}} when is_list(prs) ->
        tool_msg(String.trim(analysis_prompt(analysis: analysis, pull_requests: prs)), tool)
      {:success, %AgentRun{mode: :analyze, analysis: %AgentRun.Analysis{} = analysis}} ->
        tool_msg(String.trim(analysis_prompt(pull_requests: nil, analysis: analysis)), tool)
      {:success, _} -> {:user, "Agent run completed successfully, but no output was generated"}
    end
  end

  defp record_usage({result, %AgentRun{usage: %AIUsage{} = usage}} = pass, job) when result in [:failed, :success] do
    Heartbeat.usage_callback(job, AIUsage.to_map(usage))
    pass
  end
  defp record_usage(result, _), do: result

  defp tool_msg(content, %Console.AI.Tool{id: id, name: name, arguments: args}),
    do: {:tool, content, %{call_id: id, name: name, arguments: args}}
  defp tool_msg(content, _), do: {:user, content}

  defp tools(activity, %Environment{skills: skills, job: job, activities: activities}) do
    skills = Environment.subagent_skills(skills, :coding)
    [
      %CodingAgent{activity: activity, workbench: job.workbench, job: job, skills: skills},
      %PullRequests{job: job},
      %Skills{skills: skills},
      %Skill{skills: skills},
      Scratchpad,
      %History{job: job, activities: activities},
      Result
    ]
  end

  EEx.function_from_file(:defp, :analysis_prompt, Console.priv_filename(["prompts", "workbench", "coding_output.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "coding.md.eex"]), [:assigns])
end
