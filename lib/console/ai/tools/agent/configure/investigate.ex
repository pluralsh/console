defmodule Console.AI.Tools.Agent.Configure.Investigate do
  use Console.AI.Tools.Agent.Base
  alias Console.AI.Agents.Subagents.Investigate
  alias Console.AI.Tools.Agent.Complete

  embedded_schema do
    field :prompt, :string
  end

  @valid ~w(prompt)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/configure/prompt.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("investigate")
  def description(), do: "Investigate the system or infrastructure the user is asking about"

  def implement(%__MODULE__{prompt: prompt} = tool) do
    in_subagent(fn ->
      with {:ok, %Complete{conclusion: msg}} <- Investigate.exec(prompt, tool_id: Console.deep_get(tool, ~w(id id)a)),
        do: {:ok, msg}
    end)
  end
end
