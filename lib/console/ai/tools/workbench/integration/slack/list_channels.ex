defmodule Console.AI.Tools.Workbench.Integration.Slack.ListChannels do
  @moduledoc """
  Lists channels via Slack `conversations.list` (public and private). Responses are
  Slack JSON as returned by the Web API. Paginate with `cursor` from
  `response_metadata.next_cursor`.
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  @channel_types "public_channel,private_channel"

  embedded_schema do
    field :tool,   :map, virtual: true
    field :cursor, :string
    field :limit,  :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/list_channels.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "slack_list_channels_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List Slack channels for #{name} via conversations.list (public/private); next page cursor is response_metadata.next_cursor. Response body is Slack’s JSON. Use channel id from the listing with the post-message tool."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:cursor, :limit])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 1000)
    |> update_change(:cursor, &String.trim/1)
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{
          configuration: %Configuration{slack: %SlackConnection{bot_token: token}}
        },
        cursor: cursor,
        limit: limit
      }) do
    params =
      %{types: @channel_types}
      |> maybe_put(:limit, limit)
      |> maybe_put_cursor(cursor)

    case Client.get("conversations.list", token, params) do
      {:ok, body} -> Jason.encode(body)

      {:error, reason} ->
        {:error, "Slack conversations.list failed: #{inspect(reason)}"}
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Slack bot token is not configured for this workbench tool."}

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, key, val), do: Map.put(map, key, val)

  defp maybe_put_cursor(args, cursor) when nonempty_string(cursor), do: Map.put(args, :cursor, cursor)
  defp maybe_put_cursor(args, _), do: args
end
