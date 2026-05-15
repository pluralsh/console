defmodule Console.AI.Tools.Workbench.Integration.Slack.ListUserGroups do
  @moduledoc """
  Lists Slack user groups via [`usergroups.list`](https://api.slack.com/methods/usergroups.list).
  Pagination uses `cursor` / `response_metadata.next_cursor` like other Slack list methods.
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  embedded_schema do
    field :tool,              :map, virtual: true
    field :cursor,            :string
    field :limit,             :integer
    field :include_disabled,  :boolean
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/list_user_groups.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "slack_list_user_groups_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List Slack user groups (subteams) for #{name} via usergroups.list. Each entry includes id and handle for <!subteam^ID|handle> mentions. Next page: response_metadata.next_cursor."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:cursor, :limit, :include_disabled])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 1000)
    |> update_change(:cursor, &String.trim/1)
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{
          configuration: %Configuration{slack: %SlackConnection{bot_token: token}}
        },
        cursor: cursor,
        limit: limit,
        include_disabled: include_disabled
      }) do
    params =
      %{}
      |> maybe_put(:limit, limit)
      |> maybe_put_cursor(cursor)
      |> maybe_put_include_disabled(include_disabled)

    case Client.get("usergroups.list", token, params) do
      {:ok, body} -> Jason.encode(body)

      {:error, reason} ->
        {:error, "Slack usergroups.list failed: #{inspect(reason)}"}
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Slack bot token is not configured for this workbench tool."}

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, key, val), do: Map.put(map, key, val)

  defp maybe_put_cursor(args, cursor) when nonempty_string(cursor), do: Map.put(args, :cursor, cursor)
  defp maybe_put_cursor(args, _), do: args

  defp maybe_put_include_disabled(args, true), do: Map.put(args, :include_disabled, true)
  defp maybe_put_include_disabled(args, _), do: args
end
