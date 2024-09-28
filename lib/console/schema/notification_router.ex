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
    query = from(nr in query, left_join: f in assoc(nr, :filters), as: :filters)

    dyno = Enum.reduce(filters, dynamic(true), fn
      {:regex, r}, q ->
        dynamic([nr, filters: f], not is_nil(f.id) or (not is_nil(f.regex) and fragment("? ~ ?", f.regex, ^r)) or ^q)
      {:cluster_id, id}, q ->
        dynamic([nr, filters: f], not is_nil(f.id) or (not is_nil(f.cluster_id) and f.cluster_id == ^id) or ^q)
      {:service_id, id}, q ->
        dynamic([nr, filters: f], not is_nil(f.id) or (not is_nil(f.service_id) and f.service_id == ^id) or ^q)
      {:pipeline_id, id}, q ->
        dynamic([nr, filters: f], not is_nil(f.id) or (not is_nil(f.pipeline_id) and f.pipeline_id == ^id) or ^q)
      {:stack_id, id}, q ->
        dynamic([nr, filters: f], not is_nil(f.id) or (not is_nil(f.stack_id) and f.stack_id == ^id) or ^q)
    end)

    from(query, where: ^dyno)
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

  @events ~w(* service.update stack.run cluster.create pipeline.update pr.create pr.close)
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
