defmodule Console.Schema.Tag do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, Service, Stack}

  schema "tags" do
    field :name,  :string
    field :value, :string

    belongs_to :cluster, Cluster
    belongs_to :service, Service
    belongs_to :stack,   Stack

    timestamps()
  end

  def cluster(query \\ __MODULE__), do: from(t in query, where: not is_nil(t.cluster_id))

  def stack(query \\ __MODULE__), do: from(t in query, where: not is_nil(t.stack_id))

  def for_name(query \\ __MODULE__, name), do: from(t in query, where: t.name == ^name)

  def for_query(query \\ __MODULE__, tq, column \\ :cluster_id)

  def for_query(query, %{op: :and, tags: [_ | _] = tags}, column) do
    tags = Enum.map(tags, fn %{name: n, value: v} -> "#{n}:#{v}" end)
    from(t in query,
      group_by: field(t, ^column),
      having: fragment("array_agg(? || ':' || ?) @> ?", t.name, t.value, ^tags)
    )
    |> do_select(column)
  end

  def for_query(query, %{op: :or, tags: [_ | _] = tags}, _) do
    Enum.reduce(tags, query, fn %{name: n, value: v}, query ->
      from(t in query, or_where: t.name == ^n and t.value == ^v)
    end)
  end

  defp do_select(q, :cluster_id) do
    from(t in q, select: %{cluster_id: t.cluster_id, count: count(t.id)})
  end

  defp do_select(q, :service_id) do
    from(t in q, select: %{service_id: t.service_id, count: count(t.id)})
  end

  defp do_select(q, :stack_id) do
    from(t in q, select: %{stack_id: t.stack_id, count: count(t.id)})
  end

  def search(query \\ __MODULE__, q) do
    sq = "%#{q}%"
    from(t in query, where: like(t.name, ^sq) or like(t.value, ^sq))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]), do: from(t in query, order_by: ^order)

  def select(query \\ __MODULE__, field) do
    from(t in query,
      select: field(t, ^field),
      distinct: true
    )
  end

  def as_map([_ | _] = tags), do: Map.new(tags, & {&1.name, &1.value})
  def as_map(_), do: %{}

  @valid ~w(name value cluster_id service_id stack_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:stack_id)
    |> unique_constraint([:cluster_id, :name])
    |> unique_constraint([:service_id, :name])
    |> validate_required([:name, :value])
  end
end
