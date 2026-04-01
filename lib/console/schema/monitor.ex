defmodule Console.Schema.Monitor do
  use Console.Schema.Base
  alias Console.Schema.{Alert, Service, Workbench}

  defenum Type, log: 0
  defenum Operator, or: 0, and: 1
  defenum Aggregate, max: 0, min: 1, avg: 2

  schema "monitors" do
    field :name,            :string
    field :description,     :string
    field :alert_template,  :binary
    field :severity,        Alert.Severity, default: :low
    field :state,           Alert.State, default: :resolved
    field :type,            Type, default: :log
    field :evaluation_cron, :string
    field :next_run_at,     :utc_datetime_usec
    field :last_run_at,     :utc_datetime_usec

    embeds_one :query, Query, on_replace: :update do
      embeds_one :log, LogQuery, on_replace: :update do
        field :query,       :string
        field :bucket_size, :string
        field :duration,    :string
        field :operator,    Operator, default: :or

        embeds_many :facets, Facet, on_replace: :delete do
          field :key, :string
          field :value, :string
        end
      end
    end

    embeds_one :threshold, Threshold, on_replace: :update do
      field :aggregate, Aggregate, default: :max
      field :value, :float
    end

    belongs_to :workbench, Workbench
    belongs_to :service,   Service
    has_one    :alert,     Alert, foreign_key: :monitor_id, references: :id

    timestamps()
  end

  def for_service(query \\ __MODULE__, id) do
    from(m in query, where: m.service_id == ^id)
  end

  def search(query \\ __MODULE__, search) do
    from(m in query, where: ilike(m.name, ^"%#{search}%"))
  end

  def pollable(query \\ __MODULE__) do
    from(m in query, where: not is_nil(m.next_run_at) and m.next_run_at <= ^DateTime.utc_now())
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :next_run_at]) do
    from(m in query, order_by: ^order)
  end

  @valid ~w(
    name
    description
    alert_template
    severity
    type
    evaluation_cron
    last_run_at
    service_id
    workbench_id
    state
  )a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> then(fn cs -> cast_embed(cs, :query, with: &query_changeset(&1, &2, get_field(cs, :type))) end)
    |> cast_embed(:threshold, with: &threshold_changeset/2)
    |> foreign_key_constraint(:service_id)
    |> validate_change(:evaluation_cron, &validate_crontab/2)
    |> determine_next_run(:evaluation_cron)
    |> validate_required(~w(name severity type query threshold evaluation_cron service_id)a)
  end

  defp query_changeset(model, attrs, type) do
    model
    |> cast(attrs, [])
    |> cast_embed(:log, with: &log_changeset/2)
    |> validate_required([type])
  end

  defp log_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(query bucket_size operator duration)a)
    |> validate_format(:bucket_size, ~r/\d+[dmhs]/, message: "bucket size must be a valid golang-formatted interval string, eg 1h, 10m, 30s")
    |> validate_format(:duration, ~r/\d+[dmhs]/, message: "duration must be a valid golang-formatted interval string, eg 1h, 10m, 30s")
    |> cast_embed(:facets, with: &facet_changeset/2)
    |> validate_required(~w(query bucket_size)a)
  end

  defp facet_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(key value)a)
    |> validate_required(~w(key value)a)
  end

  defp threshold_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(aggregate value)a)
    |> validate_required(~w(aggregate value)a)
  end
end
