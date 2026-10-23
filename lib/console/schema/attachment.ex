defmodule Console.Schema.Attachment do
  use Console.Schema.Base
  alias Console.Schema.{
    Workbench,
    WorkbenchJob,
    WorkbenchJobActivity,
    QueuedPrompt,
    AgentPrompt,
    AgentRun
  }

  schema "attachments" do
    field :filename, :string
    field :filetype, :string
    field :path,     :string
    field :size,     :integer

    belongs_to :workbench,              Workbench
    belongs_to :workbench_job,          WorkbenchJob
    belongs_to :workbench_job_activity, WorkbenchJobActivity
    belongs_to :queued_prompt,          QueuedPrompt
    belongs_to :agent_prompt,           AgentPrompt
    belongs_to :agent_run,              AgentRun

    timestamps()
  end

  def image?(%__MODULE__{filetype: "image/" <> _}), do: true
  def image?(_), do: false

  def for_workbench_job(query \\ __MODULE__, id) do
    from(a in query, where: a.workbench_job_id == ^id and is_nil(a.workbench_job_activity_id))
  end

  def for_activity(query \\ __MODULE__, id) do
    from(a in query, where: a.workbench_job_activity_id == ^id)
  end

  def for_queued_prompt(query \\ __MODULE__, id) do
    from(a in query, where: a.queued_prompt_id == ^id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at, asc: :id]) do
    from(a in query, order_by: ^order)
  end

  @valid ~w(
    id
    filename
    filetype
    path
    size
    workbench_id
    workbench_job_id
    workbench_job_activity_id
    queued_prompt_id
    agent_prompt_id
    agent_run_id
  )a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:id, &Piazza.Ecto.UUID.generate_monotonic/0)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:workbench_job_id)
    |> foreign_key_constraint(:workbench_job_activity_id)
    |> foreign_key_constraint(:queued_prompt_id)
    |> foreign_key_constraint(:agent_prompt_id)
    |> foreign_key_constraint(:agent_run_id)
    |> validate_required([:filename, :path, :workbench_id])
  end
end
