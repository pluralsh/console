defmodule Console.Schema.Revision do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, ServiceConfiguration, ServiceTemplate}

  schema "revisions" do
    field :version, :string
    field :sha,     :string
    field :message, :string

    embeds_one :git,  Service.Git, on_replace: :update
    embeds_one :helm, Service.Helm, on_replace: :update
    embeds_one :kustomize, Service.Kustomize, on_replace: :update

    belongs_to :service,     Service
    belongs_to :template,    ServiceTemplate
    has_many :configuration, ServiceConfiguration

    timestamps()
  end

  def for_sha(query \\ __MODULE__, sha) do
    from(r in query, where: r.sha == ^sha)
  end

  def for_service(query \\ __MODULE__, service_id) do
    from(r in query, where: r.service_id == ^service_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at])

  def ordered(query, :ui) do
    from(r in query, order_by: [desc: coalesce(r.updated_at, r.inserted_at)])
  end

  def ordered(query, order) do
    from(r in query, order_by: ^order)
  end

  def limit(query \\ __MODULE__, limit) do
    from(r in query, limit: ^limit)
  end

  def ignore_ids(query \\ __MODULE__, ids) do
    from(r in query, where: r.id not in ^ids)
  end

  @valid ~w(version sha message)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_change(:id, Piazza.Ecto.UUID.generate_monotonic())
    |> cast_embed(:git)
    |> cast_embed(:helm)
    |> cast_embed(:kustomize, with: &Service.kustomize_changeset/2)
    |> cast_assoc(:configuration)
    |> validate_required(~w(version)a)
  end

  def update_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> cast_assoc(:configuration)
    |> validate_required(~w(version)a)
  end
end
