defmodule Console.AI.Tools.Agent.FinishInvestigation do
  use Console.AI.Tools.Agent.Base

  embedded_schema do
    field :summary, :string
    field :diagram, :string
    field :notes,   {:array, :string}
  end

  @valid ~w(summary diagram notes)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:summary, :diagram])
  end

  @json_schema Console.priv_file!("tools/agent/finish_investigation.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("finish_investigation")
  def description(), do: "Finishes the investigation by providing a summary, diagram, and notes"

  def implement(%__MODULE__{} = model), do: {:ok, model}
end
