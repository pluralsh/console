defmodule Console.Schema.FlowWorkbench do
  use Console.Schema.Base
  alias Console.Schema.{Flow, Workbench}

  schema "flow_workbenches" do
    belongs_to :flow, Flow
    belongs_to :workbench, Workbench

    timestamps()
  end

  @valid ~w(flow_id workbench_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:flow_id)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint([:flow_id, :workbench_id])
  end
end
