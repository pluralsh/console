defmodule Console.AI.Tools.Workbench.Integration.Sentry.ListIssueEvents do
  @moduledoc """
  Lists events for an issue via Sentry [`GET /api/0/organizations/{org}/issues/{issue_id}/events/`](https://docs.sentry.io/api/events/list-an-issues-events/).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Sentry.{Client, Connection, Query}

  embedded_schema do
    field :tool,              :map, virtual: true
    field :organization_slug, :string
    field :issue_id,          :string
    field :full,              :boolean
    field :stats_period,      :string
    field :query,             :string
    field :cursor,            :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/sentry/list_issue_events.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "sentry_list_issue_events_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List error events for a Sentry issue in #{name}. Set full=true to include stack traces. Use event_id with sentry_event_read for a specific occurrence."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:organization_slug, :issue_id, :full, :stats_period, :query, :cursor])
    |> validate_required([:organization_slug, :issue_id])
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_connection(tool, fn {token, host} ->
      path =
        "/organizations/#{Query.enc(m.organization_slug)}/issues/#{Query.enc(m.issue_id)}/events/"

      params = Query.merge_optional(%{}, m, [:full, :stats_period, :query, :cursor])

      case Client.get(token, host, path, params) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Sentry list issue events failed: #{inspect(reason)}"}
      end
    end)
  end
end
