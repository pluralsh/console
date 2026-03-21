defmodule Console.AI.Tools.Agent.Complete do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :conclusion, :string
  end

  @json_schema Console.priv_file!("tools/agent/complete.json") |> Jason.decode!()

  def name(), do: "agent_complete"
  def json_schema(), do: @json_schema
  def description(), do: "Complete the work for this subagent.  You should *always* call this once all work has been completed."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:conclusion])
    |> validate_required([:conclusion])
  end

  def implement(result), do: {:ok, result}
end
