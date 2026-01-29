defmodule Console.AI.Tools.Upgrade.AgentRun do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Utils
  alias Console.Schema.{User, AgentRuntime}
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

  def implement(%__MODULE__{repository: repository, prompt: prompt}) do
    with {:user, %User{} = user} <- {:user, Tool.actor()},
         {:runtime, %AgentRuntime{} = runtime} <- {:runtime, Tool.agent_runtime()} do
      Agents.create_agent_run(%{
        repository: repository,
        prompt: prompt,
      }, runtime.id, user)
    else
      {:user, _} -> {:error, "no actor found for this session"}
      {:runtime, _} -> {:error, "no runtime found"}
      err -> err
    end
  end
end
