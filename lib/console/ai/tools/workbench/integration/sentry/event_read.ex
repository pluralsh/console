defmodule Console.AI.Tools.Workbench.Integration.Sentry.EventRead do
  @moduledoc """
  Retrieves a project event via Sentry
  [`GET /api/0/projects/{org}/{project}/events/{event_id}/`](https://docs.sentry.io/api/events/retrieve-an-event-for-a-project/).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Sentry.{Client, Connection, Query}

  embedded_schema do
    field :tool,              :map, virtual: true
    field :organization_slug, :string
    field :project_slug,      :string
    field :event_id,          :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/sentry/event_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "sentry_event_read_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Read a specific Sentry event for #{name} by project and event ID (from sentry_list_issue_events). Returns full event JSON including stack trace."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:organization_slug, :project_slug, :event_id])
    |> validate_required([:organization_slug, :project_slug, :event_id])
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_connection(tool, fn {token, host} ->
      path =
        "/projects/#{Query.enc(m.organization_slug)}/#{Query.enc(m.project_slug)}/events/#{Query.enc(m.event_id)}/"

      case Client.get(token, host, path, %{}) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Sentry event read failed: #{inspect(reason)}"}
      end
    end)
  end
end
