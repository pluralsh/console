defmodule Console.AI.Chat.System do
  @moduledoc """
  System prompt for the AI chat
  """
  alias Console.Schema.{ChatThread, AgentSession}

  @chat Console.priv_file!("prompts/chat.md")
  @base_agent Console.priv_file!("prompts/agent.md")
  @code_agent Console.priv_file!("prompts/terraform_agent.md")
  @kubernetes_code_agent Console.priv_file!("prompts/kubernetes_agent.md")
  @kubernetes_code_pr_agent Console.priv_file!("prompts/kubernetes_pr.md")

  def prompt(%ChatThread{session: %AgentSession{type: :kubernetes, prompt: p, service_id: id}}) when is_binary(id), do: "#{@kubernetes_code_pr_agent}\n\nThis is your task: #{p}"
  def prompt(%ChatThread{session: %AgentSession{type: :kubernetes, prompt: p}}) when is_binary(p), do: "#{@kubernetes_code_agent}\n\nThis is your task: #{p}"
  def prompt(%ChatThread{session: %AgentSession{prompt: p}}) when is_binary(p), do: "#{@code_agent}\n\nThis is your task: #{p}"
  def prompt(%ChatThread{session: %AgentSession{}}), do: @base_agent
  def prompt(_), do: @chat
end
