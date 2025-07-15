defmodule Console.AI.Chat.Tools do
  alias Console.AI.Tools
  alias Console.AI.Tools.Agent
  alias Console.Schema.{ChatThread, AgentSession}

  @plrl_tools [
    Tools.Clusters,
    Tools.Services,
    Tools.Logs,
    Tools.Pods,
    Tools.Component,
    Tools.Prs,
    Tools.Pipelines,
    Tools.Alerts,
    Tools.AlertsResolutions
  ]

  @memory_tools [
    Tools.Knowledge.CreateEntity,
    Tools.Knowledge.CreateObservations,
    Tools.Knowledge.CreateRelationships,
    Tools.Knowledge.DeleteEntity,
    Tools.Knowledge.DeleteObservations,
    Tools.Knowledge.DeleteRelationships,
    Tools.Knowledge.Graph
  ]

  @agent_tools [
    # Agent.Query,
    # Agent.Schema,
    Agent.Plan,
    Agent.Catalogs,
    Agent.PrAutomations,
    Agent.Clusters,
    Agent.ServiceComponent,
    # Agent.Search,
    Agent.Stack
  ]
  @agent_planned_tools [Agent.CallPr]

  @code_pre_tools [Agent.Stack, Agent.Coding.StackFiles]
  @code_pr_tools [Agent.Coding.GenericPr]
  @code_post_tools [Agent.Coding.Commit, Agent.Coding.StackFiles, Agent.Done]

  @kubernetes_code_pre_tools [Agent.ServiceComponent, Agent.Coding.ServiceFiles]
  @kubernetes_code_post_tools [Agent.Coding.GenericPr, Agent.Done]

  def tools(%ChatThread{} = t) do
    memory_tools(t)
    |> Enum.concat(flow_tools(t))
    |> Enum.concat(agent_tools(t))
    |> Enum.concat(agent_planned_tools(t))
  end

  defp memory_tools(%ChatThread{} = t) do
    case ChatThread.settings(t, :memory) do
      true -> @memory_tools
      false -> []
    end
  end

  defp agent_tools(%ChatThread{session: %AgentSession{type: :kubernetes, service_id: id}}) when is_binary(id),
    do: @kubernetes_code_post_tools
  defp agent_tools(%ChatThread{session: %AgentSession{type: :kubernetes}}),
    do: @kubernetes_code_pre_tools

  defp agent_tools(%ChatThread{session: %AgentSession{type: :terraform, stack_id: id, pull_request_id: pr_id}})
    when is_binary(id) and is_binary(pr_id), do: @code_post_tools
  defp agent_tools(%ChatThread{session: %AgentSession{type: :terraform, stack_id: id}})
    when is_binary(id), do: @code_pr_tools
  defp agent_tools(%ChatThread{session: %AgentSession{type: :terraform}}), do: @code_pre_tools

  defp agent_tools(%ChatThread{session: %AgentSession{prompt: p}}) when is_binary(p), do: @code_post_tools
  defp agent_tools(%ChatThread{session: %AgentSession{}}), do: @agent_tools
  defp agent_tools(_), do: []

  defp agent_planned_tools(%ChatThread{session: %AgentSession{prompt: p}}) when is_binary(p), do: []
  defp agent_planned_tools(%ChatThread{session: %AgentSession{plan_confirmed: true}}), do: @agent_planned_tools
  defp agent_planned_tools(_), do: []

  defp flow_tools(%ChatThread{flow_id: id}) when is_binary(id), do: @plrl_tools
  defp flow_tools(_), do: []
end
