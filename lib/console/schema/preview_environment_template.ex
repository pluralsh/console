defmodule Console.Schema.PreviewEnvironmentTemplate do
  use Console.Schema.Base
  alias Console.Schema.{
    Flow,
    Service,
    ServiceTemplate,
    ScmConnection
  }

  @week_in_seconds 60 * 60 * 24 * 7

  schema "preview_environment_templates" do
    field :name,             :string
    field :comment_template, :string
    field :preview_ttl,      :integer, default: @week_in_seconds

    belongs_to :flow,              Flow
    belongs_to :reference_service, Service
    belongs_to :template,          ServiceTemplate, on_replace: :update
    belongs_to :connection,        ScmConnection

    timestamps()
  end

  def for_flow(query \\ __MODULE__, id) do
    from(t in query, where: t.flow_id == ^id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(t in query, order_by: ^order)
  end

  @valid ~w(name flow_id reference_service_id template_id comment_template connection_id)a
  @required ~w(name flow_id reference_service_id)a

  def changeset(template, attrs \\ %{}) do
    template
    |> cast(attrs, @valid)
    |> cast_assoc(:template)
    |> duration_seconds(:preview_ttl)
    |> validate_required(@required)
    |> validate_length(:name, max: 255)
    |> foreign_key_constraint(:id, name: :preview_environment, match: :prefix, message: "there is an active preview environment instance for this template")
    |> validate_format(:name, ~r/\A[a-zA-Z0-9-]+\z/)
    |> validate_number(:preview_ttl, greater_than: 0)
  end
end
