defmodule Console.Chat.Impl.Slack do
  use Console.Chat.Impl
  alias Console.Chat.Channel

  @limit 1000

  def child_spec(%ChatConnection{} = conn), do: {SlackBot, :start_link, [slack_args(conn)]}

  def search_channels(%ChatConnection{type: :slack, configuration: %{slack: %{bot_token: token}}}, query)
      when is_binary(token) do
    case Slack.API.get("conversations.list", token,
           types: "public_channel,private_channel",
           exclude_archived: true,
           limit: @limit
         ) do
      {:ok, %{"ok" => true, "channels" => channels}} ->
        channels
        |> filter(query)
        |> Enum.map(&%Channel{id: &1["id"], name: &1["name"]})
        |> then(& {:ok, &1})

      result ->
        {:error, "Failed to list channels: #{inspect(result)}"}
    end
  end
  def search_channels(%ChatConnection{}, _), do: {:error, "Slack bot token is not configured"}

  defp slack_args(%ChatConnection{type: :slack, configuration: %{
    slack: %ChatConnection.Configuration.Slack{
      app_token: app_token,
      bot_token: bot_token
    }
  }} = conn) when is_binary(app_token) and is_binary(bot_token) do
    [
      module: Console.Chat.Impl.Slack.Bot,
      name: :"slack_bot_#{conn.id}",
      config: [assigns: %{conn: conn}],
      app_token: app_token,
      bot_token: bot_token,
    ]
  end

  defp filter(channels, query) when is_binary(query) do
    String.trim(query)
    |> String.trim_leading("#")
    |> String.downcase()
    |> case do
      q when is_binary(q) and byte_size(q) > 0 ->
        Enum.filter(channels, &String.contains?(String.downcase(&1["name"] || ""), q))
      _ -> channels
    end
  end
  defp filter(channels, _), do: channels
end
