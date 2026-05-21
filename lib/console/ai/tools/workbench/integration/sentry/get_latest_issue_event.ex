defmodule Console.AI.Tools.Workbench.Integration.Sentry.GetLatestIssueEvent do
  @moduledoc """
  Fetches the latest event for an issue via Sentry
  [`GET /api/0/organizations/{org}/issues/{issue_id}/events/latest/`](https://docs.sentry.io/api/events/list-an-issues-events/).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Sentry.{Client, Connection, Query}

  embedded_schema do
    field :tool,              :map, virtual: true
    field :organization_slug, :string
    field :issue_id,          :string
    field :full,              :boolean, default: true
  end

  @json_schema Console.priv_file!("tools/workbench/integration/sentry/get_latest_issue_event.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "sentry_get_latest_issue_event_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Fetch the latest Sentry error event (with stack trace) for an issue in #{name}. Prefer this over listing all events when debugging the current failure."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:organization_slug, :issue_id, :full])
    |> validate_required([:organization_slug, :issue_id])
    |> update_change(:organization_slug, &String.trim/1)
    |> update_change(:issue_id, &String.trim/1)
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_connection(tool, fn {token, host} ->
      path =
        "/organizations/#{Query.enc(m.organization_slug)}/issues/#{Query.enc(m.issue_id)}/events/latest/"
      params = if m.full, do: %{full: true}, else: %{full: false}
      
      case Client.get(token, host, path, params) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Sentry get latest issue event failed: #{inspect(reason)}"}
      end
    end)
  end
end
