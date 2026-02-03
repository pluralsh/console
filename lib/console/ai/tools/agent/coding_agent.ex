defmodule Console.AI.Tools.Agent.CodingAgent do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Utils
  alias Console.Schema.{User, AgentRuntime, AgentSession}
  alias Console.Deployments.Agents

  embedded_schema do
    field :repository, :string
    field :prompt,     :string
  end

  @valid ~w(repository prompt)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/upgrade/agent_run.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("coding_agent")
  def description(), do: "Invokes a coding agent to make a code change with the given prompt and repository.  Only use this once you've gathered enough information to craft an effective prompt"

  def implement(%__MODULE__{repository: repo, prompt: prompt}) do
    with {:user, %User{} = user} <- {:user, Tool.actor()},
         {:session, %AgentSession{runtime: %AgentRuntime{id: rid}, id: id}} <- session(),
         {:run, {:ok, agent_run}} <- {:run, Agents.create_agent_run(%{mode: :write, repository: repo, prompt: prompt, session_id: id}, rid, user)} do
      {:ok, %{
        type: :agent_run,
        agent_run_id: agent_run.id,
        content: "Coding agent run created with id #{agent_run.id}, see progress at #{Console.url("/ai/agent-runs/#{agent_run.id}")}"
      }}
    else
      {:run, {:error, err}} -> {:error, "failed to create agent run, reason: #{inspect(err)}"}
      {:user, _} -> {:error, "no actor found for this session"}
      {:runtime, _} -> {:error, "no runtime found, you need to manually specify this in the chat context menu"}
      err -> err
    end
  end
end
