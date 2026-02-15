defmodule Console.AI.Workbench.Subagents.Coding do
  use Console.AI.Workbench.Subagents.Base
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

    case poll_run(run) do
      {:timeout, _} -> %{status: :failed, error: "agent run #{id} timed out"}
      {:failed, %AgentRun{error: error}} -> %{status: :failed, error: "Agent run failed: #{error}"}
      {:success, %AgentRun{mode: :write, pull_requests: [_ | _] = prs}} ->
        %{status: :successful, agent_run_id: id, result: %{output: String.trim(analysis_prompt(analysis: nil, pull_requests: prs))}}
      {:success, %AgentRun{mode: :analyze, analysis: %AgentRun.Analysis{} = analysis}} ->
        %{status: :successful, agent_run_id: id, result: %{output: String.trim(analysis_prompt(pull_requests: nil, analysis: analysis))}}
      {:success, _} -> %{status: :successful, agent_run_id: id, result: %{output: "Agent run completed successfully"}}
    end
  end

  defp tools(%Environment{skills: skills}) do
    [
      CodingAgent,
      %Skills{skills: skills},
      %Skill{skills: skills},
    ]
  end

  EEx.function_from_file(:defp, :analysis_prompt, Console.priv_filename(["prompts", "workbench", "coding_output.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "coding.md.eex"]), [:assigns])
end
