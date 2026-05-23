defmodule Console.AI.Tools.Workbench.Integration.Pagerduty.ListIncidentLogEntries do
  @moduledoc """
  Lists log entries for a PagerDuty incident via [`GET /incidents/{id}/log_entries`](https://developer.pagerduty.com/api-reference/3679cad205ac9-list-log-entries-for-an-incident).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Pagerduty.{Client, Connection}

  embedded_schema do
    field :tool,        :map, virtual: true
    field :incident_id, :string
    field :is_overview, :boolean
    field :since,       :string
    field :until,       :string
    field :limit,       :integer
    field :offset,      :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/pagerduty/list_incident_log_entries.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "pagerduty_list_incident_log_entries_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List timeline log entries for a PagerDuty incident for #{name}. Trigger entries may include channel details with extra context from manual or integration triggers."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:incident_id, :is_overview, :since, :until, :limit, :offset])
    |> validate_required([:incident_id])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
    |> validate_number(:offset, greater_than_or_equal_to: 0)
    |> update_change(:incident_id, &String.trim/1)
    |> update_change(:since, &trim_or_nil/1)
    |> update_change(:until, &trim_or_nil/1)
  end

  def implement(%__MODULE__{tool: tool, incident_id: id} = m) do
    params =
      %{}
      |> maybe_put(:is_overview, m.is_overview)
      |> maybe_put(:since, m.since)
      |> maybe_put(:until, m.until)
      |> maybe_put(:limit, m.limit)
      |> maybe_put(:offset, m.offset)

    Connection.with_connection(tool, fn token ->
      case Client.get(token, "/incidents/#{URI.encode(id)}/log_entries", params) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "PagerDuty list incident log entries failed: #{inspect(reason)}"}
      end
    end)
  end

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, key, val), do: Map.put(map, key, val)

  defp trim_or_nil(v) when is_binary(v) do
    case String.trim(v) do
      "" -> nil
      t -> t
    end
  end

  defp trim_or_nil(v), do: v
end
