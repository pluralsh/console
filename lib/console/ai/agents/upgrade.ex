defmodule Console.AI.Agents.Upgrade do
  import Console.AI.Agents.Base, only: [publish_absinthe: 2]
  import Console.AI.Workbench.Subagents.Base, only: [poll_run: 1]
  alias Console.Repo
  alias Console.AI.Chat.MemoryEngine
  alias Console.Schema.{
    ClusterUpgrade,
    ClusterUpgradeStep,
    User,
    AgentRun
  }
  alias Console.AI.Tools.{
    Agent.ServiceComponent,
    Agent.Stack,
    Upgrade.Coding.ServiceFiles,
    Upgrade.Coding.StackFiles,
  }
  alias Console.AI.Tools.Upgrade.AgentRun, as: CodingAgent
  require EEx

  @prompt "Use the tools available to craft a prompt for the coding agent to execute.  You can call them multiple time if needed to fully understand the problem, and once it is cogent, delegate to the coding_agent tool provided"

  def exec(%ClusterUpgrade{} = upgrade) do
    %{steps: steps, user: user} = upgrade = Repo.preload(upgrade, [:steps, :cluster, :user, :runtime])
    user = Console.Services.Rbac.preload(user)

    Task.async_stream(steps, &exec_step(&1, upgrade, user), max_concurrency: 10, timeout: :timer.minutes(30))
    |> Enum.any?(&match?({:ok, %{status: :failed}}, &1))
    |> then(&ClusterUpgrade.changeset(upgrade, %{status: if(&1, do: :failed, else: :completed)}))
    |> Repo.update()
  end

  defp exec_step(%ClusterUpgradeStep{} = step, %ClusterUpgrade{} = upgrade, %User{} = user) do
    Console.AI.Tool.context(%{
      user: user,
      runtime: upgrade.runtime
    })

    tools(step)
    |> MemoryEngine.new(30, system_prompt: prompt(step, upgrade), acc: %{}, callback: &callback(step, &1))
    |> MemoryEngine.reduce([{:user, @prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, error: "error evaluating upgrade step: #{inspect(error)}"}
    end
    |> persist_and_poll_run(step)
  end

  defp persist_and_poll_run(error, %ClusterUpgradeStep{} = step) when is_binary(error) do
    ClusterUpgradeStep.changeset(step, %{status: :failed, error: error})
    |> Repo.update()
  end

  defp persist_and_poll_run(%AgentRun{id: id} = run, %ClusterUpgradeStep{} = step) do
    ClusterUpgradeStep.changeset(step, %{agent_run_id: id})
    |> Repo.update()
    |> then(fn
      {:ok, step} -> {step, run_status(run)}
      {:error, error} -> {step, %{status: :failed, error: "error polling agent run: #{inspect(error)}"}}
    end)
    |> then(fn {step, attrs} -> ClusterUpgradeStep.changeset(step, attrs) end)
    |> Repo.update()
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%AgentRun{}, &1)) do
      %AgentRun{} = run -> {:halt, run}
      _ -> last_message(messages)
    end
  end

  defp run_status(%AgentRun{id: id} = run) do
    case poll_run(run) do
      {:timeout, _} -> %{status: :failed, error: "agent run #{id} timed out"}
      {:failed, %AgentRun{error: error}} -> %{status: :failed, error: "Agent run failed: #{error}"}
      {:success, %AgentRun{mode: :write, pull_requests: [_ | _]}} -> %{status: :completed, agent_run_id: id}
      {:success, _} ->
        %{status: :failed, agent_run_id: id, error: "agent run #{id} completed successfully but in an unexpected mode"}
    end
  end

  defp callback(%ClusterUpgradeStep{id: id, upgrade_id: upgrade_id}, {:content, content}) when is_binary(content),
    do: publish_absinthe(%{step_id: id, text: content}, cluster_upgrade_progress: "clusters:upgrades:#{upgrade_id}")
  defp callback(%ClusterUpgradeStep{id: id, upgrade_id: upgrade_id}, {:tool, content, %{name: name, arguments: args}})
    when is_binary(content) do
    publish_absinthe(
      %{step_id: id, tool: name, arguments: args, text: content},
      cluster_upgrade_progress: "clusters:upgrades:#{upgrade_id}"
    )
  end
  defp callback(_, _), do: :ok

  defp last_message(messages) do
    Enum.reverse(messages)
    |> Enum.find(&match?({:assistant, content} when is_binary(content), &1))
    |> case do
      {:assistant, content} when is_binary(content) -> content
      _ -> "no reason given for failure"
    end
    |> then(& {:cont, &1})
  end

  defp prompt(%ClusterUpgradeStep{type: :addon, prompt: prompt}, upgrade), do: addon_prompt(prompt: prompt, upgrade: upgrade) |> String.trim()
  defp prompt(%ClusterUpgradeStep{type: :cloud_addon, prompt: prompt}, upgrade), do: cloud_addon_prompt(prompt: prompt, upgrade: upgrade) |> String.trim()
  defp prompt(%ClusterUpgradeStep{type: :infrastructure, prompt: prompt}, upgrade), do: infrastructure_prompt(prompt: prompt, upgrade: upgrade) |> String.trim()

  defp tools(%ClusterUpgradeStep{type: :addon}), do: [ServiceComponent, ServiceFiles, CodingAgent]
  defp tools(%ClusterUpgradeStep{type: :cloud_addon}), do: [Stack, StackFiles, ServiceFiles, CodingAgent]
  defp tools(%ClusterUpgradeStep{type: :infrastructure}), do: [Stack, ServiceComponent, StackFiles, ServiceFiles, CodingAgent]

  EEx.function_from_file(:defp, :addon_prompt, Console.priv_filename(["prompts", "upgrade", "addon.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :cloud_addon_prompt, Console.priv_filename(["prompts", "upgrade", "cloud_addon.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :infrastructure_prompt, Console.priv_filename(["prompts", "upgrade", "infrastructure.md.eex"]), [:assigns])
end
