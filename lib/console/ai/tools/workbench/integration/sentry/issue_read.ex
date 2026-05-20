defmodule Console.AI.Tools.Workbench.Integration.Sentry.IssueRead do
  @moduledoc """
  Retrieves an issue via Sentry [`GET /api/0/organizations/{org}/issues/{issue_id}/`](https://docs.sentry.io/api/events/retrieve-an-issue/).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Sentry.{Client, Connection, Query}

  embedded_schema do
    field :tool,              :map, virtual: true
    field :organization_slug, :string
    field :issue_id,          :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/sentry/issue_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "sentry_issue_read_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Read Sentry issue details for #{name}. Returns title, status, counts, and project slug; use sentry_get_latest_issue_event or sentry_list_issue_events for stack traces."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:organization_slug, :issue_id])
    |> validate_required([:organization_slug, :issue_id])
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_connection(tool, fn {token, host} ->
      path =
        "/organizations/#{Query.enc(m.organization_slug)}/issues/#{Query.enc(m.issue_id)}/"

      case Client.get(token, host, path, %{}) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Sentry issue read failed: #{inspect(reason)}"}
      end
    end)
  end
end
