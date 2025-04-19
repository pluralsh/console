defmodule Console.Schema.KnowledgeEntity do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    Flow,
    KnowledgeObservation,
    KnowledgeRelationship,
    Service,
    Stack,
    Cluster
  }

  schema "knowledge_entities" do
    field :name,        :string
    field :type,        :string
    field :description, :string

    belongs_to :flow,    Flow
    belongs_to :service, Service
    belongs_to :stack,   Stack
    belongs_to :cluster, Cluster

    has_many :observations, KnowledgeObservation,
      on_replace: :delete,
      foreign_key: :entity_id
    has_many :relations,    KnowledgeRelationship,
      on_replace: :delete,
      foreign_key: :from_id

    timestamps()
  end

  def for_parent(query \\ __MODULE__, parent)
  def for_parent(query, %Flow{id: flow_id}), do: from(e in query, where: e.flow_id == ^flow_id)
  def for_parent(query, %Service{id: svc_id}), do: from(e in query, where: e.service_id == ^svc_id)
  def for_parent(query, %Stack{id: stack_id}), do: from(e in query, where: e.stack_id == ^stack_id)
  def for_parent(query, %Cluster{id: cluster_id}), do: from(e in query, where: e.cluster_id == ^cluster_id)

  def search(query \\ __MODULE__, q) do
    from(e in query, where: ilike(e.name, ^"%#{q}%") or ilike(e.type, ^"%#{q}%"))
  end

  def for_flow(query \\ __MODULE__, flow_id) do
    from(e in query, where: e.flow_id == ^flow_id)
  end

  @valid ~w(name type description service_id stack_id cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:observations)
    |> cast_assoc(:relations)
    |> validate_required(~w(name type)a)
    |> foreign_key_constraint(:flow_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:cluster_id)
    |> unique_constraint([:flow_id, :name])
    |> unique_constraint([:service_id, :name])
    |> unique_constraint([:stack_id, :name])
    |> unique_constraint([:cluster_id, :name])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 1000)
  end
end
