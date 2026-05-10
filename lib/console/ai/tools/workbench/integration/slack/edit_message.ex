defmodule Console.AI.Tools.Workbench.Integration.Slack.EditMessage do
  @moduledoc false
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  embedded_schema do
    field :tool,       :map, virtual: true
    field :channel_id, :string
    field :message_ts, :string
    field :text,       :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/edit_message.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "slack_edit_message_#{name}"
  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Edit an existing Slack message for #{name} using chat.update. Pass `channel_id` from slack_list_channels or slack_find_channel_by_name, and `message_ts` (`ts`) from the message or from slack_post_message."
  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:channel_id, :message_ts, :text])
    |> validate_required([:channel_id, :message_ts, :text])
  end

  def implement(%__MODULE__{
    tool: %WorkbenchTool{configuration: %Configuration{slack: %SlackConnection{bot_token: token}}},
    channel_id: channel_id,
    message_ts: message_ts,
    text: text
  }) do
    case Client.post("chat.update", token, %{channel: channel_id, ts: message_ts, text: text}) do
      {:ok, body} ->
        Jason.encode(body)

      {:error, reason} ->
        {:error, "Slack chat.update failed: #{inspect(reason)}"}
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Slack bot token is not configured for this workbench tool."}
end
