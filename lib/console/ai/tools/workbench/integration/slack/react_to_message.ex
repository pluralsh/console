defmodule Console.AI.Tools.Workbench.Integration.Slack.ReactToMessage do
  @moduledoc false
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  embedded_schema do
    field :tool,       :map, virtual: true
    field :channel_id, :string
    field :message_ts, :string
    field :emoji,      :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/react_to_message.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "slack_react_to_message_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Add an emoji reaction to a Slack message for #{name} via reactions.add. Pass `channel_id` from slack_list_channels or slack_find_channel_by_name, and `message_ts` (`ts`) from slack_list_messages, slack_post_message, or message metadata."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:channel_id, :message_ts, :emoji])
    |> validate_required([:channel_id, :message_ts, :emoji])
    |> update_change(:emoji, &normalize_emoji/1)
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{slack: %SlackConnection{bot_token: token}}},
        channel_id: channel_id,
        message_ts: message_ts,
        emoji: emoji
      }) do
    case Client.post("reactions.add", token, %{
           channel: channel_id,
           timestamp: message_ts,
           name: emoji
         }) do
      {:ok, body} ->
        Jason.encode(body)

      {:error, reason} ->
        {:error, "Slack reactions.add failed: #{inspect(reason)}"}
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Slack bot token is not configured for this workbench tool."}

  defp normalize_emoji(emoji) when is_binary(emoji), do: emoji |> String.trim() |> String.trim_leading(":") |> String.trim_trailing(":")
  defp normalize_emoji(emoji), do: emoji
end
