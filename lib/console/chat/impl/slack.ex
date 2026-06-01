defmodule Console.Chat.Impl.Slack do
  use Slack.Bot
  use Console.Chat.Impl
  alias Console.Chat.{Channel, Utils, Reference}
  use Nebulex.Caching
  require Logger

  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.hours(1)

  @limit 1000

  def handle_event(event, %{"ts" => ts, "text" => text, "channel" => channel}, %Slack.Bot{user_id: id} = bot) do
    Logger.info("incoming slack #{event}: #{text}")
    case String.contains?(text, "<@#{id}>") do
      true -> spawn_job(ts, text, channel, bot)
      false -> :ok
    end
  end
  def handle_event(_, _, _), do: :ok

  def child_spec(%ChatConnection{} = conn), do: {Slack.Supervisor, :start_link, [slack_args(conn)]}

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
      bot_token: bot_token,
      bot: __MODULE__,
      bot_assigns: %{conn: conn},
      app_token: app_token,
      channels: [types: ~w(public_channel private_channel)],
      supervisor_args: [name: {:via, Registry, {Console.AI.Agents, {:slack_bot, conn.id}}}]
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

  @decorate cacheable(cache: @cache_adapter, key: {:slack_channel, id}, opts: [ttl: @ttl])
  defp fetch_channel(id, token) do
    case Slack.API.get("conversations.info", token, channel: id) do
      {:ok, %{"ok" => true, "channel" => %{"name" => name}}} -> {:ok, name}
      result -> {:error, "Failed to fetch channel: #{inspect(result)}"}
    end
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
