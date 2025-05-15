defmodule Console.Schema.PreviewEnvironmentInstance do
  use Piazza.Ecto.Schema

  alias Console.Schema.{
    PreviewEnvironmentTemplate,
    Service,
    PullRequest
  }

  schema "preview_environment_instances" do
    embeds_one :status, Status, on_replace: :update do
      field :comment_id, :string
    end

    belongs_to :pull_request, PullRequest
    belongs_to :template,     PreviewEnvironmentTemplate
    belongs_to :service,      Service

    timestamps()
  end

  def for_flow(query \\ __MODULE__, id) do
    from(i in query,
      join: t in assoc(i, :template),
      where: t.flow_id == ^id
    )
  end

  def for_service(query \\ __MODULE__, id) do
    from(i in query,
      join: t in assoc(i, :template),
      where: t.reference_service_id == ^id
    )
  end

  def for_template(query \\ __MODULE__, id) do
    from(i in query, where: i.template_id == ^id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(i in query, order_by: ^order)
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:service, :pull_request, template: [:reference_service, :template]]) do
    from(i in query, preload: ^preloads)
  end

  @valid ~w(template_id service_id pull_request_id)a
  @required ~w(template_id service_id pull_request_id)a

  def changeset(instance, attrs) do
    instance
    |> cast(attrs, @valid)
    |> cast_embed(:status, with: &status_changeset/2)
    |> validate_required(@required)
  end

  defp status_changeset(status, attrs) do
    status
    |> cast(attrs, [:comment_id])
  end
end
