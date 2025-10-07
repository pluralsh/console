defmodule Console.AI.Tools.ApproveStack do
  use Ecto.Schema
  import Ecto.Changeset
  alias Console.Schema.StackRun.ApprovalResult

  embedded_schema do
    field :reason, :string
    field :result, ApprovalResult
  end

  @valid ~w(reason result)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/approve_stack.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: :approve_stack
  def description(), do: "Determines whether or not the given terraform plan should be approved"

  def implement(%__MODULE__{} = tool), do: {:ok, tool}
end
