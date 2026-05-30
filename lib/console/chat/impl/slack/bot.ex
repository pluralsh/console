defmodule Console.Chat.Impl.Slack.Bot do
  use SlackBot
  alias Console.Schema.ChatConnection
  alias Console.Chat.{Utils, Reference}
  require Logger

  defmodule LogMiddleware do
    require Logger

    def call(event, payload, ctx) do
      Logger.info("incoming slack #{event}: #{payload["text"]}")
      {:cont, payload, ctx}
    end
  end

  middleware LogMiddleware

  handle_event "app_mention", %{"ts" => ts, "text" => text, "channel" => channel}, %{config: conf, assigns: %{conn: %ChatConnection{} = conn}} do
    spawn_job(ts, text, channel, conf.bot_token, conn)
  end

  defp spawn_job(ts, text, channel, %SlackBot.Config{} = config, %ChatConnection{} = conn) do
    with %{"name" => name} <- SlackBot.Cache.get_channel(config, channel),
         {:ok, _} <- Utils.handle_mention(%Reference{id: ts, text: text}, %Reference{id: channel, text: name}, conn) do
      :ok
    else
      :ok -> :ok
      err -> Logger.error("failed to spawn job: #{inspect(err)}")
    end
  end
  defp spawn_job(_, _, _, _, _), do: :ok

  defp fetch_channel(id, token) do
    case Slack.API.get("conversations.info", token, channel: id) do
      {:ok, %{"ok" => true, "channel" => %{"name" => name}}} -> {:ok, name}
      result -> {:error, "Failed to fetch channel: #{inspect(result)}"}
    end
  end
end
