defmodule Console.AI.Tools.Workbench.Integration.Slack.ListMessages do
  @moduledoc """
  Lists recent messages in a Slack channel via `conversations.history`.
  Paginate with `cursor` from `response_metadata.next_cursor`.
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  embedded_schema do
    field :tool,       :map, virtual: true
    field :channel_id, :string
    field :cursor,     :string
    field :limit,      :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/list_messages.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "slack_list_messages_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List recent messages in a Slack channel for #{name} via conversations.history. Pass `channel_id` from slack_list_channels or slack_find_channel_by_name. Each message includes a `ts` field for slack_edit_message or slack_react_to_message. Next page cursor is response_metadata.next_cursor."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:channel_id, :cursor, :limit])
    |> validate_required([:channel_id])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 1000)
    |> update_change(:cursor, &String.trim/1)
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{
          configuration: %Configuration{slack: %SlackConnection{bot_token: token}}
        },
        channel_id: channel_id,
        cursor: cursor,
        limit: limit
      }) do
    params =
      %{channel: channel_id}
      |> maybe_put(:limit, limit)
      |> maybe_put_cursor(cursor)

    case Client.get("conversations.history", token, params) do
      {:ok, body} -> Jason.encode(body)

      {:error, reason} ->
        {:error, "Slack conversations.history failed: #{inspect(reason)}"}
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Slack bot token is not configured for this workbench tool."}

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, key, val), do: Map.put(map, key, val)

  defp maybe_put_cursor(args, cursor) when nonempty_string(cursor), do: Map.put(args, :cursor, cursor)
  defp maybe_put_cursor(args, _), do: args
end
