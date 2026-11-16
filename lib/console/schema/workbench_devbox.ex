defmodule Console.Schema.WorkbenchDevbox do
  use Console.Schema.Base
  alias Console.Schema.{Workbench, Devbox}

  schema "workbench_devboxes" do
    belongs_to :workbench, Workbench
    belongs_to :devbox,    Devbox

    timestamps()
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(wd in query, where: wd.workbench_id == ^workbench_id)
  end

  def for_devbox(query \\ __MODULE__, devbox_id) do
    from(wd in query, where: wd.devbox_id == ^devbox_id)
  end

  @valid ~w(workbench_id devbox_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:devbox_id)
    |> unique_constraint([:workbench_id, :devbox_id], message: "this devbox is already attached to the workbench")
    |> validate_required(@valid)
  end
end
