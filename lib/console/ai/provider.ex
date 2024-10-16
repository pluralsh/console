defmodule Console.AI.Provider do
  alias Console.Schema.{DeploymentSettings, DeploymentSettings.AI}
  alias Console.AI.{OpenAI}

  @type sender :: :system | :user | :assistant
  @type history :: [{sender, binary}]

  @preface {:system, """
  You're a seasoned devops engineer with experience in Kubernetes, GitOps and Infrastructure As Code, and need to
  give a concise but clear explanation of issues in your companies kubernetes infrastructure.  The user is not necessarily
  an expert in the domain, so please provide as much documentation and evidence as is necessary to explain what issue they're
  facing.  Please provide a clear summary and any details to debug what's going on with the case provided.
  """}

  @callback completion(struct, history) :: {:ok, binary} | {:error, binary}

  def completion(history) do
    settings = Console.Deployments.Settings.cached()
    with {:ok, %mod{} = client} <- client(settings),
      do: mod.completion(client, [@preface | history])
  end

  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :openai, openai: %{} = openai}}),
    do: {:ok, OpenAI.new(openai)}
  defp client(_), do: {:error, "ai not fully enabled yet"}
end
