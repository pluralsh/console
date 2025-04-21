defmodule Console.Schema.ServiceComponent do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, ApiDeprecation, ComponentContent, AiInsight, ServiceComponentChild}

  defenum State, running: 0, pending: 1, failed: 2, paused: 3

  schema "service_components" do
    field :state,      State
    field :synced,     :boolean
    field :group,      :string
    field :version,    :string
    field :kind,       :string
    field :namespace,  :string
    field :name,       :string

    belongs_to :service, Service
    belongs_to :insight, AiInsight, on_replace: :update
    has_many :api_deprecations, ApiDeprecation, foreign_key: :component_id, on_replace: :delete
    has_one :content, ComponentContent, foreign_key: :component_id, on_replace: :delete
    has_many :children, ServiceComponentChild, foreign_key: :component_id, on_replace: :delete

    timestamps()
  end

  def for_identifier(query \\ __MODULE__, {g, v, k, ns, n}) do
    for_group(query, g)
    |> for_version(v)
    |> for_kind(k)
    |> for_namespace(ns)
    |> for_name(n)
  end

  def for_states(query \\ __MODULE__, states) do
    vals = Enum.map(states, fn s ->
      {:ok, s} = State.dump(s)
      s
    end)
    from(sc in query, where: sc.state in ^vals)
  end

  def for_service(query \\ __MODULE__, service_id) do
    from(sc in query, where: sc.service_id == ^service_id)
  end

  def for_group(query, nil), do: from(sc in query, where: is_nil(sc.group))
  def for_group(query, group), do: from(sc in query, where: sc.group == ^group)

  def for_version(query, version), do: from(sc in query, where: sc.version == ^version)

  def for_kind(query, kind), do: from(sc in query, where: sc.kind == ^kind)

  def for_namespace(query, nil), do: from(sc in query, where: is_nil(sc.namespace))
  def for_namespace(query, namespace), do: from(sc in query, where: sc.namespace == ^namespace)

  def for_name(query, name), do: from(sc in query, where: sc.name == ^name)

  @valid ~w(state synced group version kind namespace name)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:content)
    |> cast_assoc(:insight)
    |> cast_assoc(:children)
    |> foreign_key_constraint(:service)
    |> validate_required([:kind, :name])
  end
end
