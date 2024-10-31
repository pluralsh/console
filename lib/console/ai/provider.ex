defmodule Console.AI.Provider do
  alias Console.Schema.{DeploymentSettings, DeploymentSettings.AI}
  alias Console.AI.{OpenAI, Anthropic, Ollama, Azure, Bedrock}

  @type sender :: :system | :user | :assistant
  @type history :: [{sender, binary}]

  @preface {:system, """
  You're a seasoned devops engineer with experience in Kubernetes, GitOps and Infrastructure As Code, and need to
  give a concise but clear explanation of issues in your companies kubernetes infrastructure.  The user is not necessarily
  an expert in the domain, so please provide as much documentation and evidence as is necessary to explain what issue they're
  facing.  Please provide a clear summary and any details to debug what's going on with the case provided.  You should guide users
  to implement GitOps best practices, so avoid telling them to manually modify resources via kubectl or helm commands directly, although
  kubectl commands can be used for gathering further info about the problem.
  """}

  @summary """
  You're a seasoned devops engineer with experience in Kubernetes, GitOps and Infrastructure as Code.  The following is a detailed explanation of how to debug an issue in a user's kubernetes or cloud infrastructure.
  Please provide a brief, easily digestable summary of this in at most 3 sentences.
  """

  @callback completion(struct, history) :: {:ok, binary} | {:error, binary}

  def completion(history, opts \\ []) do
    settings = Console.Deployments.Settings.cached()
    with {:ok, %mod{} = client} <- client(settings),
      do: mod.completion(client, add_preface(history, opts))
  end

  def summary(text),
    do: completion([{:user, text}], preface: @summary)

  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :openai, openai: %{} = openai}}),
    do: {:ok, OpenAI.new(openai)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :anthropic, anthropic: %{} = anthropic}}),
    do: {:ok, Anthropic.new(anthropic)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :ollama, ollama: %{} = ollama}}),
    do: {:ok, Ollama.new(ollama)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :azure, azure: %{} = azure}}),
    do: {:ok, Azure.new(azure)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :bedrock, bedrock: %{} = bedrock}}),
    do: {:ok, Bedrock.new(bedrock)}
  defp client(_), do: {:error, "ai not enabled for this Plural Console instance"}

  defp add_preface(history, opts) do
    case opts[:preface] do
      val when is_binary(val) -> [{:system, val} | history]
      :ignore -> history
      _ -> [@preface | history]
    end
  end
end
