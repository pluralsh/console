defmodule Console.AI.Tools.Workbench.Monitoring.MonitorUpsert do
  use Console.AI.Tools.Workbench.Base
  import Console.AI.Tools.Agent.Base, only: [check_uuid: 2]
  alias Console.AI.Tools.Workbench.Monitoring

  defmodule Attributes do
    use Console.AI.Tools.Workbench.Base
    import Console.AI.Tools.Agent.Base, only: [check_uuid: 2]
    alias Console.Schema.{Alert, Monitor}
    alias Console.Schema.WorkbenchJob.Modes

    @name_max 255
    @description_max 10_000
    @prompt_max 2_048
    @evaluation_cron_max 255

    embedded_schema do
      field :name, :string
      field :description, :string
      field :alert_template, :binary
      field :severity, Alert.Severity
      field :type, Monitor.Type
      field :evaluation_cron, :string
      field :service_id, :binary_id
      field :prompt, :string

      embeds_one :modes, Modes
      embeds_one :query, Monitor.Query
      embeds_one :threshold, Monitor.Threshold
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [
        :name,
        :description,
        :alert_template,
        :severity,
        :type,
        :evaluation_cron,
        :service_id,
        :prompt
      ])
      |> check_uuid(:service_id)
      |> then(fn cs ->
        cast_embed(cs, :query,
          with: &Monitor.query_changeset(&1, &2, get_field(cs, :type))
        )
      end)
      |> cast_embed(:threshold, with: &Monitor.threshold_changeset/2)
      |> cast_embed(:modes)
      |> validate_length(:name, max: @name_max)
      |> validate_length(:description, max: @description_max)
      |> validate_length(:prompt, max: @prompt_max)
      |> validate_length(:evaluation_cron, max: @evaluation_cron_max)
      |> validate_required([
        :name,
        :severity,
        :type,
        :evaluation_cron,
        :service_id,
        :query,
        :threshold
      ])
    end
  end

  embedded_schema do
    field :job, :map, virtual: true
    field :user, :map, virtual: true
    field :monitor_id, :binary_id
    embeds_one :attributes, Attributes
  end

  @json_schema_path Console.priv_filename("tools/workbench/monitoring/monitor_upsert.json")
  @external_resource @json_schema_path
  @json_schema @json_schema_path |> File.read!() |> Jason.decode!()

  def name(_), do: "workbench_monitor_upsert"
  def json_schema(_), do: @json_schema

  def description(_),
    do: "Create a monitor in this workbench, or update one when monitor_id is provided. Use a fully typed log or metrics query and threshold."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:monitor_id])
    |> check_uuid(:monitor_id)
    |> cast_embed(:attributes, required: true)
  end

  def implement(%__MODULE__{job: job, user: user, monitor_id: id, attributes: attrs}),
    do: Monitoring.upsert_monitor(job, user, id, attrs)
end
