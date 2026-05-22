defmodule Console.AI.Tools.Workbench.Integration.Pagerduty.ListIncidentNotes do
  @moduledoc """
  Lists notes for a PagerDuty incident via [`GET /incidents/{id}/notes`](https://developer.pagerduty.com/api-reference/988fd8460f5f0-list-notes-for-an-incident).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Pagerduty.{Client, Connection}

  embedded_schema do
    field :tool,        :map, virtual: true
    field :incident_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/pagerduty/list_incident_notes.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "pagerduty_list_incident_notes_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "List notes attached to a PagerDuty incident for #{name}."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:incident_id])
    |> validate_required([:incident_id])
    |> update_change(:incident_id, &String.trim/1)
  end

  def implement(%__MODULE__{tool: tool, incident_id: id}) do
    Connection.with_connection(tool, fn token ->
      case Client.get(token, "/incidents/#{URI.encode(id)}/notes", %{}) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "PagerDuty list incident notes failed: #{inspect(reason)}"}
      end
    end)
  end
end
