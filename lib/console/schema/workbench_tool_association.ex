defmodule Console.Schema.WorkbenchToolAssociation do
  use Console.Schema.Base
  alias Console.Schema.{Workbench, WorkbenchTool}

  schema "workbench_tool_associations" do
    belongs_to :workbench, Workbench
    belongs_to :tool, WorkbenchTool

    timestamps()
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(a in query, where: a.workbench_id == ^workbench_id)
  end

  def for_tool(query \\ __MODULE__, tool_id) do
    from(a in query, where: a.tool_id == ^tool_id)
  end

  @valid ~w(workbench_id tool_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:tool_id)
    |> unique_constraint([:workbench_id, :tool_id])
    |> validate_required([:tool_id])
  end
end
