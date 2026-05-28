defmodule Console.Chat.Impl.Slack do
  use Slack.Bot
  use Console.Chat.Impl

  def handle_event(event, msg, bot) do
    Logger.info("Slack event: #{event} #{inspect(msg)}")
    Logger.info("Slack bot: #{inspect(bot)}")
    :ok
  end

  def child_spec(%ChatConnection{} = conn), do: {Slack.Supervisor, :start_link, [slack_args(conn)]}

  defp slack_args(%ChatConnection{type: :slack, configuration: %{
    slack: %ChatConnection.Configuration.Slack{
      app_token: app_token,
      bot_token: bot_token
    }
  }}) when is_binary(app_token) and is_binary(bot_token) do
    [
      bot_token: bot_token,
      bot: __MODULE__,
      app_token: app_token,
      channels: [types: ~w(public_channel private_channel)]
    ]
  end
end
