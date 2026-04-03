defmodule Console.Schema.Issue do
  use Console.Schema.Base

  alias Console.Schema.{Workbench, WorkbenchJob, Flow, IssueWebhook}

  defenum Status, open: 0, in_progress: 1, cancelled: 2, completed: 3

  schema "issues" do
    field :provider,    IssueWebhook.Provider
    field :status,      Status
    field :external_id, :string
    field :url,         :string
    field :title,       :string
    field :body,        :string

    belongs_to :workbench,  Workbench
    belongs_to :flow,       Flow
    has_one :workbench_job, WorkbenchJob

    timestamps()
  end

  def for_user(query \\ __MODULE__, user) do
    from(i in query,
      join: w in subquery(Workbench.for_user(user)),
      on: w.id == i.workbench_id
    )
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(i in query, order_by: ^order)
  end

  def for_flow(query \\ __MODULE__, flow_id) do
    from(i in query, where: i.flow_id == ^flow_id)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(i in query, where: i.workbench_id == ^workbench_id)
  end

  def for_provider(query \\ __MODULE__, provider) do
    from(i in query, where: i.provider == ^provider)
  end

  def for_status(query \\ __MODULE__, status) do
    from(i in query, where: i.status == ^status)
  end

  @valid ~w(provider status external_id url title body workbench_id flow_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:external_id)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:flow_id)
    |> validate_required([:provider, :status, :external_id, :url, :title, :body])
  end
end
