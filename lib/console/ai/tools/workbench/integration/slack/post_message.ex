defmodule Console.AI.Tools.Workbench.Integration.Slack.PostMessage do
  @moduledoc false
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  embedded_schema do
    field :tool,       :map, virtual: true
    field :channel_id, :string
    field :text,       :string
    field :thread_ts,  :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/post_message.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "slack_post_message_#{name}"
  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Post a message to a public or private Slack channel for #{name}. Pass `channel_id` from slack_list_channels or slack_find_channel_by_name (not the human-facing display name). Pass optional `thread_ts` to reply in a thread using a message `ts` from slack_list_messages or message metadata."
  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:channel_id, :text, :thread_ts])
    |> validate_required([:channel_id, :text])
  end

  def implement(%__MODULE__{
    tool: %WorkbenchTool{configuration: %Configuration{slack: %SlackConnection{bot_token: token}}},
    channel_id: channel_id,
    text: text,
    thread_ts: thread_ts
  }) do
    params =
      %{channel: channel_id, text: text}
      |> maybe_put_thread_ts(thread_ts)

    case Client.post("chat.postMessage", token, params) do
      {:ok, body} ->
        Jason.encode(body)

      {:error, reason} ->
        {:error, "Slack chat.postMessage failed: #{inspect(reason)}"}
    end
  end
  def implement(%__MODULE__{}), do: {:error, "Slack bot token is not configured for this workbench tool."}

  defp maybe_put_thread_ts(params, thread_ts) when nonempty_string(thread_ts),
    do: Map.put(params, :thread_ts, thread_ts)

  defp maybe_put_thread_ts(params, _), do: params
end
