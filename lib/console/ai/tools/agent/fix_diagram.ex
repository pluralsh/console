defmodule Console.AI.Tools.Agent.FixDiagram do
  use Console.AI.Tools.Agent.Base

  embedded_schema do
    field :diagram, :string
  end

  @valid ~w(diagram)a

  @json_schema Console.priv_file!("tools/agent/fix_diagram.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("fix_diagram")
  def description(), do: "Corrects issues with mermaid diagram syntax based on existing errors"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  def implement(model), do: {:ok, model}
end
