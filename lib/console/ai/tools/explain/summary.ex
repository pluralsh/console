defmodule Console.AI.Tools.Explain.Summary do
  use Console.AI.Tools.Agent.Base

  embedded_schema do
    field :relevant, :boolean
    field :summary, :string
  end

  @json_schema Console.priv_file!("tools/explain/summary.json") |> Jason.decode!()
  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("resource_summary")
  def description(), do: "Summarizes a specific piece of software or infrastructure based on the user's provided prompt"

  @valid ~w(relevant summary)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  def implement(%__MODULE__{} = res), do: {:ok, res}
end
