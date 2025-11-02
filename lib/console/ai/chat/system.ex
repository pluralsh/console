defmodule Console.AI.Chat.System do
  @moduledoc """
  System prompt for the AI chat
  """
  alias Console.Schema.{ChatThread, AgentSession, AiInsight}

  @chat Console.priv_file!("prompts/chat.md")
  @agent_pre Console.priv_file!("prompts/agent_pre.md")
  @agent_search Console.priv_file!("prompts/agent_search.md")
  @agent_manifests Console.priv_file!("prompts/agent_manifests.md")
  @agent_chat Console.priv_file!("prompts/agent_chat.md")
  @provisioning Console.priv_file!("prompts/provisioning.md")
  @code_agent Console.priv_file!("prompts/terraform_agent.md")
  @code_pr Console.priv_file!("prompts/terraform_pr.md")
  @code_commit Console.priv_file!("prompts/terraform_commit.md")
  @kubernetes_code_agent Console.priv_file!("prompts/kubernetes_agent.md")
  @kubernetes_code_pr_agent Console.priv_file!("prompts/kubernetes_pr.md")
  @insight_chat Console.priv_file!("prompts/insight_chat.md")
  @research Console.priv_file!("prompts/research.md")

  def prompt(%ChatThread{research_id: id}) when is_binary(id), do: @research
  def prompt(%ChatThread{insight: %AiInsight{text: t}}),
    do: "#{@insight_chat}\n\nThis is the insight you will be working on: #{t}"
  def prompt(%ChatThread{session: %AgentSession{type: :kubernetes, prompt: p, service_id: id}}) when is_binary(id), do: "#{@kubernetes_code_pr_agent}\n\nThis is your task: #{p}"
  def prompt(%ChatThread{session: %AgentSession{type: :kubernetes, prompt: p}}) when is_binary(p), do: "#{@kubernetes_code_agent}\n\nThis is your task: #{p}"
  def prompt(%ChatThread{session: %AgentSession{type: :terraform, prompt: p, service_id: id, pull_request_id: pr_id}})
    when is_binary(id) and is_binary(pr_id), do: "#{@code_commit}\n\nThis is your task: #{p}"
  def prompt(%ChatThread{session: %AgentSession{type: :terraform, prompt: p, service_id: id}})
    when is_binary(id), do: "#{@code_pr}\n\nThis is your task: #{p}"
  def prompt(%ChatThread{session: %AgentSession{prompt: p}}) when is_binary(p), do: "#{@code_agent}\n\nThis is your task: #{p}"
  def prompt(%ChatThread{session: %AgentSession{type: nil}}), do: @agent_pre
  def prompt(%ChatThread{session: %AgentSession{type: :search}}), do: @agent_search
  def prompt(%ChatThread{session: %AgentSession{type: :provisioning}}), do: @provisioning
  def prompt(%ChatThread{session: %AgentSession{type: :manifests}}), do: @agent_manifests
  def prompt(%ChatThread{session: %AgentSession{type: :chat}}), do: @agent_chat
  def prompt(%ChatThread{session: %AgentSession{}}), do: @agent_pre
  def prompt(_), do: @chat
end
