defmodule Console.Chat.Impl.Slack do
  use Slack.Bot
  use Console.Chat.Impl
  alias Console.Chat.{Utils, Reference}

  def handle_event(_, %{"ts" => ts, "text" => text, "channel" => channel}, %Slack.Bot{user_id: id} = bot) do
    case String.contains?(text, "<@#{id}>") do
      true -> spawn_job(ts, text, channel, bot)
      false -> :ok
    end
  end
  def handle_event(_, _, _), do: :ok

  def child_spec(%ChatConnection{} = conn), do: {Slack.Supervisor, :start_link, [slack_args(conn)]}

  defp slack_args(%ChatConnection{type: :slack, configuration: %{
    slack: %ChatConnection.Configuration.Slack{
      app_token: app_token,
      bot_token: bot_token
    }
  }} = conn) when is_binary(app_token) and is_binary(bot_token) do
    [
      bot_token: bot_token,
      bot: __MODULE__,
      bot_assigns: %{conn: conn},
      app_token: app_token,
      channels: [types: ~w(public_channel private_channel)]
    ]
  end

  defp spawn_job(ts, text, channel, %Slack.Bot{assigns: %{conn: %ChatConnection{} = conn}, token: token}) do
    with {:ok, name} <- fetch_channel(channel, token),
         {:ok, _} <- Utils.handle_mention(%Reference{id: ts, text: text}, %Reference{id: channel, text: name}, conn) do
      :ok
    else
      :ok -> :ok
      err -> Logger.error("failed to spawn job: #{inspect(err)}")
    end
  end
  defp spawn_job(_, _, _, _), do: :ok

  defp fetch_channel(id, token) do
    case Slack.API.get("conversations.info", token, channel: id) |> IO.inspect(label: "slack conversation") do
      {:ok, %{"ok" => true, "channel" => %{"name" => name}}} -> {:ok, name}
      result -> {:error, "Failed to fetch channel: #{inspect(result)}"}
    end
  end
end
