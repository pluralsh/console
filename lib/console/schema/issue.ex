defmodule Console.Schema.Issue do
  use Console.Schema.Base

  alias Console.Schema.{Workbench, WorkbenchJob, Flow, IssueWebhook, WorkbenchWebhook}

  defenum Status, open: 0, in_progress: 1, cancelled: 2, completed: 3

  schema "issues" do
    field :provider,       IssueWebhook.Provider
    field :status,         Status
    field :external_id,    :string
    field :url,            :string
    field :title,          :string
    field :body,           :string
    field :payload,        :map
    field :status_changed, :boolean, virtual: true, default: false
    field :webhook,        :map, virtual: true

    belongs_to :workbench,         Workbench
    belongs_to :workbench_webhook, WorkbenchWebhook
    belongs_to :flow,              Flow
    has_one :workbench_job,        WorkbenchJob

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

  def for_references(query \\ __MODULE__, provider, urls) do
    from(i in query, where: i.provider == ^provider and i.url in ^urls)
  end

  def for_status(query \\ __MODULE__, status) do
    from(i in query, where: i.status == ^status)
  end

  def for_statuses(query \\ __MODULE__, statuses)
  def for_statuses(query, []), do: from(i in query, where: false)
  def for_statuses(query, statuses) when is_list(statuses) do
    from(i in query, where: i.status in ^statuses)
  end

  def for_providers(query \\ __MODULE__, providers)
  def for_providers(query, []), do: from(i in query, where: false)
  def for_providers(query, providers) when is_list(providers) do
    from(i in query, where: i.provider in ^providers)
  end

  def search(query \\ __MODULE__, q) do
    from(i in query, where: ilike(i.title, ^"%#{q}%") or ilike(i.external_id, ^"%#{q}%"))
  end

  def count_by_status(query \\ __MODULE__) do
    from(i in query, group_by: i.status, select: %{status: i.status, count: count(i.id)})
  end

  def count_by_provider(query \\ __MODULE__) do
    from(i in query, group_by: i.provider, select: %{provider: i.provider, count: count(i.id)})
  end

  @valid ~w(provider status external_id url title body payload workbench_id workbench_webhook_id flow_id webhook)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> truncate_fields([:body], 10_000)
    |> unique_constraint(:external_id)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:flow_id)
    |> validate_required([:provider, :status, :external_id, :url, :title, :body])
    |> change_markers(status: :status_changed)
    |> validate_one_present(~w(workbench_id flow_id)a)
  end
end
