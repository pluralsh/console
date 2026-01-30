defmodule Console.AI.Agents.Upgrade do
  alias Console.Repo
  alias Console.AI.Chat.MemoryEngine
  alias Console.Schema.{
    ClusterUpgrade,
    ClusterUpgradeStep,
    User,
  }
  alias Console.AI.Tools.{
    Agent.ServiceComponent,
    Agent.Stack,
    Upgrade.Coding.ServiceFiles,
    Upgrade.Coding.StackFiles,
    Upgrade.AgentRun
  }
  require EEx

  @prompt "Attempt to launch the coding agent to generate the needed pr for this.  If it's not clear enough, end the conversation with an explanation as to why"

  def exec(%ClusterUpgrade{} = upgrade) do
    %{steps: steps, user: user} = Repo.preload(upgrade, [:steps, :cluster, :user, :runtime])
    user = Console.Services.Rbac.preload(user)

    Task.async_stream(steps, &exec_step(&1, upgrade, user), max_concurrency: 10, timeout: :infinity)
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
    |> MemoryEngine.new(20, system_prompt: prompt(step, upgrade), acc: %{})
    |> MemoryEngine.reduce([{:user, @prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, error: "error evaluating upgrade step: #{inspect(error)}"}
    end
    |> then(&ClusterUpgradeStep.changeset(step, &1))
    |> Repo.update()
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Console.Schema.AgentRun{}, &1)) do
      %Console.Schema.AgentRun{id: id} -> {:halt, %{status: :completed, agent_run_id: id}}
      _ -> last_message(messages)
    end
  end

  defp last_message(messages) do
    Enum.reverse(messages)
    |> Enum.find(&match?({:assistant, content} when is_binary(content), &1))
    |> case do
      {:assistant, content} when is_binary(content) -> %{status: :failed, error: content}
      _ -> %{status: :failed, error: "no reason given for failure"}
    end
    |> then(& {:cont, &1})
  end

  defp prompt(%ClusterUpgradeStep{type: :addon, prompt: prompt}, upgrade), do: addon_prompt(prompt: prompt, upgrade: upgrade) |> String.trim()
  defp prompt(%ClusterUpgradeStep{type: :cloud_addon, prompt: prompt}, upgrade), do: cloud_addon_prompt(prompt: prompt, upgrade: upgrade) |> String.trim()
  defp prompt(%ClusterUpgradeStep{type: :infrastructure, prompt: prompt}, upgrade), do: infrastructure_prompt(prompt: prompt, upgrade: upgrade) |> String.trim()

  defp tools(%ClusterUpgradeStep{type: :addon}), do: [ServiceComponent, ServiceFiles, AgentRun]
  defp tools(%ClusterUpgradeStep{type: :cloud_addon}), do: [Stack, StackFiles, ServiceFiles, AgentRun]
  defp tools(%ClusterUpgradeStep{type: :infrastructure}), do: [Stack, StackFiles, ServiceFiles, AgentRun]

  EEx.function_from_file(:defp, :addon_prompt, Console.priv_filename(["prompts", "upgrade", "addon.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :cloud_addon_prompt, Console.priv_filename(["prompts", "upgrade", "cloud_addon.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :infrastructure_prompt, Console.priv_filename(["prompts", "upgrade", "infrastructure.md.eex"]), [:assigns])
end
