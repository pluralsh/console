defmodule Console.Schema.WorkbenchJobActivityAgentRun do
  use Console.Schema.Base
  alias Console.Schema.{WorkbenchJobActivity, AgentRun}

  schema "workbench_job_activity_agent_runs" do
    belongs_to :workbench_job_activity, WorkbenchJobActivity
    belongs_to :agent_run, AgentRun

    timestamps()
  end

  def for_activity(query \\ __MODULE__, activity_id) do
    from(a in query, where: a.workbench_job_activity_id == ^activity_id)
  end

  def for_agent_run(query \\ __MODULE__, agent_run_id) do
    from(a in query, where: a.agent_run_id == ^agent_run_id)
  end

  @valid ~w(workbench_job_activity_id agent_run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_job_activity_id)
    |> foreign_key_constraint(:agent_run_id)
    |> unique_constraint([:workbench_job_activity_id, :agent_run_id])
    |> validate_required([:workbench_job_activity_id, :agent_run_id])
  end
end
