defmodule Console.AI.Workbench.Subagents.Coding do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{
    WorkbenchJob,
    WorkbenchJobActivity,
    AgentRun,
    AIUsage
  }
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
  alias Console.AI.Workbench.Subagents.Integration
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{} = job, %Environment{} = environment) do
    tools(activity, environment)
    |> MemoryEngine.new(20,
      engine_opts(environment) ++ [
        system_prompt: String.trim(system_prompt(prompt: WorkbenchJob.objective(job))),
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
    {runs, messages} = Enum.split_with(messages, &match?(%AgentRun{}, &1))
    case {runs, Enum.find(messages, &stop_msg/1)} do
      {[_ | _] = runs, _} ->
        case parallel_runs(runs, job) do
          {:messages, results} -> {:messages, results}
          {:error, error} -> last_message(messages, fn _ ->
            {:cont, %{status: :failed, result: %{error: "error running parallel agent runs: #{inspect(error)}"}}}
          end)
        end
      {_, %Result{output: output}} -> {:halt, %{status: :successful, result: %{output: output}}}
      {_, _} -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp stop_msg(%AgentRun{}), do: true
  defp stop_msg(%Result{}), do: true
  defp stop_msg(_), do: false

  defp parallel_runs(runs, job) do
    Task.async_stream(runs, &persist_and_poll_run(&1, job), timeout: :infinity, max_concurrency: 10)
    |> Enum.reduce_while([], fn
      {:ok, result}, acc -> {:cont, [result | acc]}
      {:exit, error}, _ -> {:halt, {:error, error}}
    end)
    |> case do
      results when is_list(results) -> {:messages, results}
      {:error, error} -> {:error, error}
    end
  end

  defp persist_and_poll_run(%AgentRun{id: id, tool: tool} = run, job) do
    poll_run(run)
    |> preload_run()
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

  defp preload_run({result, %AgentRun{} = run}),
    do: {result, Repo.preload(run, [:pull_requests, :runtime])}

  defp record_usage({result, %AgentRun{usage: %AIUsage{} = usage} = run} = pass, job)
       when result in [:failed, :success] do
    Environment.runtime_usage_callback(job, run, AIUsage.to_map(usage))
    pass
  end
  defp record_usage(result, _), do: result

  defp tool_msg(content, %Console.AI.Tool{id: id, name: name, arguments: args}),
    do: {:tool, content, %{call_id: id, name: name, arguments: args}}
  defp tool_msg(content, _), do: {:user, content}

  defp tools(activity, %Environment{skills: skills, tools: workbench_tools, job: job, activities: activities}) do
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
    |> Enum.concat(Integration.scm_tools(workbench_tools))
  end

  EEx.function_from_file(:defp, :analysis_prompt, Console.priv_filename(["prompts", "workbench", "coding_output.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "coding.md.eex"]), [:assigns])
end
