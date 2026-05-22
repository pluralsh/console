defmodule Console.AI.Tools.Workbench.Integration.Pagerduty.GetIncident do
  @moduledoc """
  Retrieves a PagerDuty incident via [`GET /incidents/{id}`](https://developer.pagerduty.com/api-reference/367602b1c2e48-get-an-incident).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Pagerduty.{Client, Connection}

  embedded_schema do
    field :tool,        :map, virtual: true
    field :incident_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/pagerduty/get_incident.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "pagerduty_get_incident_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Get full PagerDuty incident details for #{name}, including title, status, urgency, priority, service, assignments, and body.details (the UI description). Use incident id from webhooks or pagerduty_list_incidents."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:incident_id])
    |> validate_required([:incident_id])
    |> update_change(:incident_id, &String.trim/1)
  end

  def implement(%__MODULE__{tool: tool, incident_id: id}) do
    Connection.with_connection(tool, fn token ->
      case Client.get(token, "/incidents/#{URI.encode(id)}", %{}) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "PagerDuty get incident failed: #{inspect(reason)}"}
      end
    end)
  end
end
