defmodule Console.Chat.Impl.Slack do
  use Slack.Bot
  use Console.Chat.Impl

  def handle_event(event, msg, _) do
    Logger.info("Slack event: #{event} #{inspect(msg)}")
    :ok
  end

  def child_spec(%ChatConnection{} = conn),
   do: {Slack.Supervisor, :start_link, [slack_args(conn)]}

  defp slack_args(%ChatConnection{type: :slack, configuration: %{
    slack: %ChatConnection.Configuration.Slack{
      app_token: app_token,
      bot_token: bot_token,
      bot_id: bot_id
    }
  }}) when is_binary(app_token) and is_binary(bot_token) do
    [
      bot_token: bot_token,
      bot_id: bot_id,
      bot: __MODULE__,
      app_token: app_token,
      channels: [
        types: ["public_channel", "private_channel", "im"]
      ]
    ]
  end
end
