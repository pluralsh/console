defmodule Console.Schema.NotificationRouter do
  use Piazza.Ecto.Schema
  alias Console.Schema.{RouterFilter, RouterSink}

  schema "notification_routers" do
    field :name,   :string
    field :events, {:array, :string}

    has_many :filters, RouterFilter,
      foreign_key: :router_id,
      on_replace: :delete

    has_many :router_sinks, RouterSink,
      foreign_key: :router_id,
      on_replace: :delete

    has_many :sinks, through: [:router_sinks, :sink]

    timestamps()
  end

  def for_filters(query \\ __MODULE__, filters) do
    from(nr in query,
      left_join: f in assoc(nr, :filters),
      left_join: f2 in ^RouterFilter.for_filters(filters),
        on: f2.router_id == nr.id,
      where: is_nil(f.id) or not is_nil(f2.id),
      distinct: true
    )
  end

  def for_event(query \\ __MODULE__, event) do
    from(nr in query, where: ^event in nr.events or "*" in nr.events)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(nr in query, order_by: ^order)
  end

  def preloaded(query \\ __MODULE__, preloads) do
    from(nr in query, preload: ^preloads)
  end

  @valid ~w(name events)a

  @events ~w(service.update stack.run stack.pending cluster.create pipeline.update pr.create pr.close service.insight stack.insight cluster.insight alert.fired *)
  @error_msg "events must all be one of [#{Enum.join(@events, ",")}]"

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:filters)
    |> cast_assoc(:router_sinks)
    |> validate_subset(:events, @events, message: @error_msg)
    |> validate_required(@valid)
  end
end
