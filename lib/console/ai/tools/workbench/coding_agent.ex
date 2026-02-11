defmodule Console.AI.Tools.Workbench.CodingAgent do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tool
  alias Console.Schema.{User, AgentRuntime, AgentRun}
  alias Console.Deployments.Agents

  embedded_schema do
    field :mode,       AgentRun.Mode
    field :repository, :string
    field :prompt,     :string
  end

  @valid ~w(mode repository prompt)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/workbench/coding_agent.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "workbench_coding_agent"
  def description(), do: "Invokes a coding agent to make a code change with the given prompt and repository.  Only use this once you've gathered enough information to craft an effective prompt"

  def implement(%__MODULE__{mode: mode, repository: repository, prompt: prompt}) do
    with {:user, %User{} = user} <- {:user, Tool.actor()},
         {:runtime, %AgentRuntime{} = runtime} <- {:runtime, Tool.agent_runtime()} do
      Agents.create_agent_run(%{
        repository: repository,
        prompt: prompt,
        mode: mode
      }, runtime.id, user)
    else
      {:user, _} -> {:error, "no actor found for this session"}
      {:runtime, _} -> {:error, "no runtime found, you need to manually specify this in the chat context menu"}
      err -> err
    end
  end
end
