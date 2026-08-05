defmodule Console.AI.Workbench.Subagents.Verify do
  use Console.AI.Workbench.Subagents.Base
  alias Console.AI.Workbench.Subagents.{Infrastructure, Observability}
  alias Console.Deployments.Sentinels
  alias Console.Schema.{SentinelRun, WorkbenchJob, WorkbenchJobActivity}
  alias Console.AI.Tools.Workbench.{Result, Skills, Skill, Scratchpad}
  alias Console.AI.Tools.Workbench.Sentinel.{
    FetchSentinelRun,
    FetchSentinelRunJob,
    ListSentinels,
    RunSentinel
  }
  alias Console.AI.Workbench.Environment
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{} = job, %Environment{} = environment) do
    tools(job, environment)
    |> MemoryEngine.new(20,
      engine_opts(job) ++ [
        system_prompt: String.trim(system_prompt(prompt: WorkbenchJob.objective(job))),
        acc: %{},
        callback: &callback(activity, &1),
        pre_enable: [Result, %Skills{} ,%Skill{}],
        continue_msg: cont_msg()
      ]
    )
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running verification subagent: #{inspect(error)}"}}
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &stop_msg/1) do
      %RunSentinel{} = run -> {:message, run_and_poll_sentinel(run)}
      %Result{output: output} -> {:halt, %{
        status: :successful,
        result: %{output: output}
      }}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp stop_msg(%RunSentinel{}), do: true
  defp stop_msg(%Result{}), do: true
  defp stop_msg(_), do: false

  defp tools(%WorkbenchJob{} = job, %Environment{skills: skills} = environment) do
    skills = Environment.subagent_skills(skills, :verify)

    Observability.core_tools(job, environment)
    |> Enum.concat(Infrastructure.core_tools(job, environment))
    |> Enum.concat(sentinel_tools(job))
    |> Enum.concat([
      %Skills{skills: skills},
      %Skill{skills: skills},
      Scratchpad,
      Result
    ])
  end

  defp sentinel_tools(%WorkbenchJob{workbench: %{configuration: %{infrastructure: %{sentinels: true}}}, user: user}) do
    [
      %ListSentinels{user: user},
      %FetchSentinelRun{user: user},
      %FetchSentinelRunJob{user: user},
      %RunSentinel{user: user}
    ]
  end
  defp sentinel_tools(_), do: []

  defp run_and_poll_sentinel(%RunSentinel{user: user, sentinel: %{id: id}, overrides: overrides} = tool) do
    with {:ok, run} <- Sentinels.run_sentinel(overrides || %{}, id, user),
         {:ok, run} <- poll_sentinel_run(run) do
      run
      |> FetchSentinelRun.run_summary()
      |> Jason.encode!()
      |> then(&tool_msg(&1, tool))
    else
      {:timeout, %SentinelRun{id: run_id}} -> tool_msg("sentinel run #{run_id} timed out before completion", tool)
      {:error, err} -> tool_msg("failed to run sentinel, reason: #{inspect(err)}", tool)
      error -> tool_msg("failed to run sentinel, reason: #{inspect(error)}", tool)
    end
  end

  @poll_iters 60
  @poll_interval :timer.minutes(1)

  defp poll_sentinel_run(run, iter \\ 0)
  defp poll_sentinel_run(%SentinelRun{} = run, iter) when iter >= @poll_iters, do: {:timeout, run}
  defp poll_sentinel_run(%SentinelRun{status: status} = run, _) when status in [:success, :failed],
    do: {:ok, Repo.preload(run, [:jobs], force: true)}
  defp poll_sentinel_run(%SentinelRun{id: id} = run, iter) do
    :timer.sleep(@poll_interval)

    case Repo.get(SentinelRun, id) do
      %SentinelRun{} = run -> poll_sentinel_run(run, iter + 1)
      nil -> {:error, "sentinel run #{run.id} was deleted before completion"}
    end
  end

  defp tool_msg(content, %RunSentinel{id: %Console.AI.Tool{id: id, name: name, arguments: args}}),
    do: {:tool, content, %{call_id: id, name: name, arguments: args}}
  defp tool_msg(content, _), do: {:user, content}

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "verify.md.eex"]), [:assigns])
end
