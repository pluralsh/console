defmodule Console.AI.Workbench.Subagents.Integration do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, WorkbenchTool}
  alias Console.AI.Tools.Workbench.{Result, Skills, Skill, Http, Scratchpad}
  alias Console.AI.Tools.Workbench.Integration.Slack.{CreateChannel, EditMessage, FindChannelByName, InviteToChannel, ListChannels, ListUserGroups, PostMessage}
  alias Console.AI.Tools.Workbench.Integration.Github.Tools, as: GithubTools
  alias Console.AI.Tools.Workbench.Integration.Gitlab.Tools, as: GitlabTools
  alias Console.AI.Tools.Workbench.Integration.Bitbucket.Tools, as: BitbucketTools
  alias Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.Tools, as: BitbucketDatacenterTools
  alias Console.AI.Tools.Workbench.Integration.AzureDevops.Tools, as: AzureDevopsTools
  alias Console.AI.Tools.Workbench.Integration.Teams.Tools, as: TeamsTools
  alias Console.AI.Tools.Workbench.Integration.Pagerduty.Tools, as: PagerdutyTools
  alias Console.AI.Workbench.{Environment, MCP}

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt}, %Environment{} = environment) do
    tools(environment)
    |> MemoryEngine.new(20,
      system_prompt: &String.trim(system_prompt(prompt: jprompt, engine: &1)),
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
    case Enum.find(messages, &match?(%Result{}, &1)) do
      %Result{output: output} -> {:halt, %{
        status: :successful,
        result: %{output: output}
      }}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp tools(%Environment{skills: skills, tools: tools, job: job}) do
    workbench_tools(tools)
    |> Enum.concat(MCP.expand_tools(Environment.subagent_tools(tools, :integration), job))
    |> Enum.concat([
      %Skills{skills: Environment.subagent_skills(skills, :integration)},
      %Skill{skills: Environment.subagent_skills(skills, :integration)},
      Scratchpad,
      Result
    ])
  end

  @allowed_tools ~w(http slack pagerduty github gitlab bitbucket bitbucket_datacenter teams azure_devops)a

  defp workbench_tools(tools) do
    Enum.map(tools, &elem(&1, 1))
    |> Enum.filter(fn
      %WorkbenchTool{tool: t} when t in @allowed_tools -> true
      _ -> false
    end)
    |> Enum.flat_map(fn
      %WorkbenchTool{tool: :http} = tool -> [%Http{tool: tool}]
      %WorkbenchTool{tool: :slack} = tool ->
        [
          %ListChannels{tool: tool},
          %ListUserGroups{tool: tool},
          %FindChannelByName{tool: tool},
          %InviteToChannel{tool: tool},
          %CreateChannel{tool: tool},
          %PostMessage{tool: tool},
          %EditMessage{tool: tool}
        ]
      %WorkbenchTool{tool: :github} = tool -> GithubTools.expand(tool)
      %WorkbenchTool{tool: :gitlab} = tool -> GitlabTools.expand(tool)
      %WorkbenchTool{tool: :bitbucket} = tool -> BitbucketTools.expand(tool)
      %WorkbenchTool{tool: :bitbucket_datacenter} = tool -> BitbucketDatacenterTools.expand(tool)
      %WorkbenchTool{tool: :azure_devops} = tool -> AzureDevopsTools.expand(tool)
      %WorkbenchTool{tool: :teams} = tool -> TeamsTools.expand(tool)
      %WorkbenchTool{tool: :pagerduty} = tool -> PagerdutyTools.expand(tool)
    end)
  end

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "integration.md.eex"]), [:assigns])
end
