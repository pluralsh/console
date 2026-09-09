defmodule Console.Schema.Monitor do
  use Console.Schema.Base
  alias Console.Schema.{Alert, Service, User, Workbench}
  alias Console.Schema.WorkbenchJob.Modes

  defenum Type, log: 0, metrics: 1
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
    field :prompt,          :string

    embeds_one :modes, Modes, on_replace: :update

    embeds_one :query, Query, on_replace: :update do
      embeds_one :log, LogQuery, on_replace: :update do
        field :tool,        :string
        field :query,       :string
        field :bucket_size, :string
        field :duration,    :string
        field :operator,    Operator, default: :or

        embeds_one :options, Options, on_replace: :update, primary_key: false do
          embeds_one :azure, Azure, on_replace: :update, primary_key: false do
            field :resource_id, :string
          end
        end

        embeds_many :facets, Facet, on_replace: :delete do
          field :key, :string
          field :value, :string
        end
      end

      embeds_one :metrics, MetricsQuery, on_replace: :update do
        field :tool,     :string
        field :query,    :string
        field :step,     :string
        field :duration, :string

        embeds_one :options, Options, on_replace: :update, primary_key: false do
          embeds_one :azure, Azure, on_replace: :update, primary_key: false do
            field :resource_id,       :string
            field :metrics_namespace, :string
            field :aggregation,       :string
            field :filter,            :string
            field :order_by,          :string
            field :roll_up_by,        :string
            field :metrics_endpoint,  :string
          end
        end
      end
    end

    embeds_one :threshold, Threshold, on_replace: :update do
      field :aggregate, Aggregate, default: :max
      field :value, :float
    end

    belongs_to :workbench, Workbench
    belongs_to :service,   Service
    belongs_to :user,      User
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
    user_id
    prompt
    state
  )a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> then(fn cs -> cast_embed(cs, :query, with: &query_changeset(&1, &2, get_field(cs, :type))) end)
    |> cast_embed(:threshold, with: &threshold_changeset/2)
    |> cast_embed(:modes)
    |> validate_tool_context()
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:user_id)
    |> validate_length(:prompt, max: 2048)
    |> validate_change(:evaluation_cron, &validate_crontab/2)
    |> determine_next_run(:evaluation_cron)
    |> validate_required(~w(name severity type query threshold evaluation_cron service_id)a)
  end

  defp query_changeset(model, attrs, type) do
    model
    |> cast(attrs, [])
    |> cast_embed(:log, with: &log_changeset/2)
    |> cast_embed(:metrics, with: &metrics_changeset/2)
    |> validate_required([type])
    |> validate_query_type(type)
  end

  defp log_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(tool query bucket_size operator duration)a)
    |> validate_format(:bucket_size, ~r/\d+[dmhs]/, message: "bucket size must be a valid golang-formatted interval string, eg 1h, 10m, 30s")
    |> validate_format(:duration, ~r/\d+[dmhs]/, message: "duration must be a valid golang-formatted interval string, eg 1h, 10m, 30s")
    |> cast_embed(:options, with: &log_options_changeset/2)
    |> cast_embed(:facets, with: &facet_changeset/2)
    |> validate_required(~w(query bucket_size)a)
  end

  defp metrics_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(tool query step duration)a)
    |> validate_format(:step, ~r/\d+[dmhs]/, message: "step must be a valid golang-formatted interval string, eg 1h, 10m, 30s")
    |> validate_format(:duration, ~r/\d+[dmhs]/, message: "duration must be a valid golang-formatted interval string, eg 1h, 10m, 30s")
    |> cast_embed(:options, with: &metrics_options_changeset/2)
    |> validate_required(~w(query)a)
  end

  defp log_options_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:azure, with: &log_azure_options_changeset/2)
  end

  defp log_azure_options_changeset(model, attrs), do: cast(model, attrs, [:resource_id])

  defp metrics_options_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:azure, with: &metrics_azure_options_changeset/2)
  end

  defp metrics_azure_options_changeset(model, attrs) do
    cast(model, attrs, ~w(resource_id metrics_namespace aggregation filter order_by roll_up_by metrics_endpoint)a)
  end

  defp validate_query_type(changeset, type) when type in [:log, :metrics] do
    other = if type == :log, do: :metrics, else: :log

    case get_field(changeset, other) do
      nil -> changeset
      _ -> add_error(changeset, other, "does not match monitor type #{type}")
    end
  end
  defp validate_query_type(changeset, _), do: changeset

  defp validate_tool_context(changeset) do
    type = get_field(changeset, :type)
    query = get_field(changeset, :query)
    selected = query && Map.get(query, type)

    case {selected, get_field(changeset, :workbench_id)} do
      {%{tool: tool}, nil} when is_binary(tool) and byte_size(tool) > 0 ->
        add_error(changeset, :workbench_id, "is required for tool-backed monitor queries")
      _ ->
        changeset
    end
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
