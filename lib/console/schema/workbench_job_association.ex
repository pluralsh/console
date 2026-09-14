defmodule Console.Schema.WorkbenchJobAssociation do
  use Console.Schema.Base
  alias Console.Schema.{Dashboard, Monitor, WorkbenchJob}

  schema "workbench_job_associations" do
    belongs_to :workbench_job, WorkbenchJob
    belongs_to :dashboard, Dashboard
    belongs_to :monitor, Monitor

    timestamps()
  end

  def for_workbench_job(query \\ __MODULE__, workbench_job_id) do
    from(a in query, where: a.workbench_job_id == ^workbench_job_id)
  end

  @valid ~w(workbench_job_id dashboard_id monitor_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_job_id)
    |> foreign_key_constraint(:dashboard_id)
    |> foreign_key_constraint(:monitor_id)
    |> unique_constraint([:workbench_job_id, :dashboard_id])
    |> unique_constraint([:workbench_job_id, :monitor_id])
    |> validate_required([:workbench_job_id])
    |> validate_target()
  end

  defp validate_target(changeset) do
    case {get_field(changeset, :dashboard_id), get_field(changeset, :monitor_id)} do
      {nil, nil} -> add_error(changeset, :base, "a dashboard or monitor must be associated")
      _ -> changeset
    end
  end
end
