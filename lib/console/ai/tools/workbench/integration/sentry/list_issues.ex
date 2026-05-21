defmodule Console.AI.Tools.Workbench.Integration.Sentry.ListIssues do
  @moduledoc """
  Lists issues via Sentry [`GET /api/0/organizations/{org}/issues/`](https://docs.sentry.io/api/events/list-an-organizations-issues/).
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Sentry.{Client, Connection, Query}

  embedded_schema do
    field :tool,               :map, virtual: true
    field :organization_slug,  :string
    field :query,              :string
    field :stats_period,       :string
    field :project,            {:array, :integer}
    field :environment,        {:array, :string}
    field :sort,               :string
    field :limit,              :integer
    field :cursor,             :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/sentry/list_issues.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "sentry_list_issues_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List or search Sentry issues for #{name} (unresolved errors, filters via Sentry query syntax). Use issue_id from results with sentry_issue_read or sentry_list_issue_events for stack traces."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:organization_slug, :query, :stats_period, :project, :environment, :sort, :limit, :cursor])
    |> validate_required([:organization_slug])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_connection(tool, fn {token, host} ->
      path = "/organizations/#{Query.enc(m.organization_slug)}/issues/"

      params =
        %{}
        |> Query.merge_optional(m, [:query, :stats_period, :project, :environment, :sort, :limit, :cursor])

      case Client.get(token, host, path, params) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Sentry list issues failed: #{inspect(reason)}"}
      end
    end)
  end
end
