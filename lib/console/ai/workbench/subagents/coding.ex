defmodule Console.AI.Workbench.Subagents.Coding do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Repo
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, AgentRun}
  alias Console.AI.Tools.Workbench.{Skills, Skill, CodingAgent}
  alias Console.Deployments.Workbenches
  alias Console.AI.Workbench.Environment

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt}, %Environment{} = environment) do
    tools(environment)
    |> MemoryEngine.new(20, system_prompt: system_prompt(prompt: jprompt), acc: %{}, callback: &callback(activity, &1))
    |> MemoryEngine.reduce([{:user, prompt}], &reducer(activity, &1, &2))
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, error: "error running infrastructure subagent: #{inspect(error)}"}
    end
  end

  defp reducer(activity, messages, _) do
    case Enum.find(messages, &match?(%AgentRun{}, &1)) do
      %AgentRun{} = run -> {:halt, persist_and_poll_run(activity,run)}
      _ -> last_message(messages, & {:cont, %{status: :failed, error: &1}})
    end
  end

  defp persist_and_poll_run(activity, %AgentRun{id: id} = run) do
    Workbenches.update_job_activity(%{
      status: :running,
      agent_run_id: id
    }, activity)

    poll_run(run)
  end

  defp poll_run(run, iter \\ 0)
  defp poll_run(%AgentRun{id: id}, iters) when iters >= 60,
    do: %{status: :failed, error: "agent run #{id} failed to complete within poll interval"}

  defp poll_run(%AgentRun{id: id, mode: :write, pull_requests: [_ | _] = prs}, _),
    do: %{status: :successful, agent_run_id: id, result: %{output: String.trim(analysis_prompt(analysis: nil, pull_requests: prs))}}

  defp poll_run(%AgentRun{id: id, mode: :analyze, analysis: %AgentRun.Analysis{} = analysis}, _),
    do: %{status: :successful, agent_run_id: id, result: %{output: String.trim(analysis_prompt(pull_requests: nil, analysis: analysis))}}

  defp poll_run(%AgentRun{id: id}, iter) do
    jitter_sleep()

    Console.Repo.get(AgentRun, id)
    |> Repo.preload([:pull_requests])
    |> poll_run(iter + 1)
  end

  defp tools(%Environment{skills: skills}) do
    [
      CodingAgent,
      %Skills{skills: skills},
      %Skill{skills: skills},
    ]
  end

  defp jitter_sleep() do
    time = :timer.seconds(5)
    :timer.sleep(time + Console.jitter(time))
  end

  EEx.function_from_file(:defp, :analysis_prompt, Console.priv_filename(["prompts", "workbench", "coding_output.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "coding.md.eex"]), [:assigns])
end
