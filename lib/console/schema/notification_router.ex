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

  @events ~w(* service.update cluster.create pipeline.update)
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
