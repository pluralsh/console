defmodule Console.AI.Tools.Workbench.Integration.Pagerduty.ListIncidents do
  @moduledoc """
  Lists PagerDuty incidents via [`GET /incidents`](https://developer.pagerduty.com/api-reference/9d0b0b12e36f9-list-incidents).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Pagerduty.{Client, Connection}

  embedded_schema do
    field :tool,         :map, virtual: true
    field :statuses,     {:array, :string}
    field :service_ids,  {:array, :string}
    field :incident_key, :string
    field :since,        :string
    field :until,        :string
    field :limit,        :integer
    field :offset,       :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/pagerduty/list_incidents.json") |> Jason.decode!()

  @default_includes ~w(services teams priorities first_trigger_log_entries)

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "pagerduty_list_incidents_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List PagerDuty incidents for #{name}. Filter by status, service, or time range. Response includes pagination fields offset, limit, and more."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:statuses, :service_ids, :incident_key, :since, :until, :limit, :offset])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
    |> validate_number(:offset, greater_than_or_equal_to: 0)
    |> update_change(:incident_key, &trim_or_nil/1)
    |> update_change(:since, &trim_or_nil/1)
    |> update_change(:until, &trim_or_nil/1)
  end

  def implement(%__MODULE__{tool: tool} = m) do
    params =
      %{include: @default_includes}
      |> maybe_put(:statuses, m.statuses)
      |> maybe_put(:service_ids, m.service_ids)
      |> maybe_put(:incident_key, m.incident_key)
      |> maybe_put(:since, m.since)
      |> maybe_put(:until, m.until)
      |> maybe_put(:limit, m.limit)
      |> maybe_put(:offset, m.offset)

    Connection.with_connection(tool, fn token ->
      case Client.get(token, "/incidents", params) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "PagerDuty list incidents failed: #{inspect(reason)}"}
      end
    end)
  end

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, _k, []), do: map
  defp maybe_put(map, key, val), do: Map.put(map, key, val)

  defp trim_or_nil(v) when is_binary(v) do
    case String.trim(v) do
      "" -> nil
      t -> t
    end
  end

  defp trim_or_nil(v), do: v
end
