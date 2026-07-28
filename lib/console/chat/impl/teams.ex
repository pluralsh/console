defmodule Console.Chat.Impl.Teams do
  @moduledoc """
  Microsoft Teams chat provider.

  Unlike Slack (which holds an outbound Socket Mode websocket per connection), Teams has no bot-initiated
  socket for messaging, so inbound activities arrive via a Bot Framework webhook (see
  `ConsoleWeb.WebhookController.teams/2`).  This module therefore has no long-lived process - `child_spec/1`
  is intentionally unimplemented.  It parses inbound activities, matches bot mentions and delegates to
  `Console.Chat.Utils.handle_mention/4`, and implements channel search for the connection UI.
  """
  use Console.Chat.Impl
  alias Console.Chat.{Channel, Utils, Reference}
  alias Console.AI.Tools.Workbench.Integration.Teams.{Client, TokenExchange}
  require Logger

  @mention "mention"
  @team_filter "resourceProvisioningOptions/Any(c:c eq 'Team')"
  @team_limit 50

  @doc """
  Handles an inbound Bot Framework activity, spawning a workbench job when the bot is mentioned in a message.
  """
  @spec handle_activity(ChatConnection.t(), map) :: :ok
  def handle_activity(%ChatConnection{} = conn, %{"type" => "message"} = activity) do
    case mentioned?(activity) do
      true  -> spawn_job(conn, activity)
      false -> :ok
    end
  end
  def handle_activity(_, _), do: :ok

  @impl true
  def child_spec(%ChatConnection{}),
    do: {:error, "teams chat connections are served via inbound webhook, not a supervised process"}

  @impl true
  def search_channels(%ChatConnection{type: :teams, configuration: %{teams: %{client_id: cid, client_secret: secret, tenant_id: tid}}}, query)
      when is_binary(cid) and is_binary(secret) and is_binary(tid) do
    with {:ok, client} <- TokenExchange.exchange(cid, secret, tid),
         {:ok, %{"value" => teams}} <- Client.get(client, "/groups", team_params()) do
      teams
      |> Enum.flat_map(&team_channels(client, &1))
      |> filter(query)
      |> then(& {:ok, &1})
    else
      err -> {:error, "failed to list teams channels: #{inspect(err)}"}
    end
  end
  def search_channels(%ChatConnection{}, _), do: {:error, "Microsoft Teams app registration is not configured"}

  defp team_params() do
    %{
      "$filter" => @team_filter,
      "$select" => "id,displayName",
      "$orderby" => "displayName",
      "$top" => @team_limit
    }
  end

  defp team_channels(client, %{"id" => team_id, "displayName" => team_name}) do
    case Client.get(client, "/teams/#{URI.encode(team_id, &URI.char_unreserved?/1)}/channels", %{"$select" => "id,displayName"}) do
      {:ok, %{"value" => channels}} ->
        Enum.map(channels, & %Channel{id: &1["id"], name: "#{team_name} / #{&1["displayName"]}"})
      _ -> []
    end
  end
  defp team_channels(_, _), do: []

  defp mentioned?(%{"recipient" => %{"id" => bot_id}, "entities" => entities}) when is_list(entities) and is_binary(bot_id) do
    Enum.any?(entities, fn
      %{"type" => @mention, "mentioned" => %{"id" => ^bot_id}} -> true
      _ -> false
    end)
  end
  defp mentioned?(_), do: false

  defp spawn_job(%ChatConnection{} = conn, activity) do
    msg = %Reference{id: activity["id"], text: clean_text(activity)}
    channel = %Reference{id: channel_id(activity), text: channel_id(activity)}

    extra = %{
      service_url: activity["serviceUrl"],
      conversation_id: conversation_id(activity),
      activity_id: activity["id"]
    }

    case Utils.handle_mention(msg, channel, conn, extra) do
      {:ok, _} -> :ok
      :ok -> :ok
      err ->
        Logger.error("failed to spawn teams job: #{inspect(err)}")
        :ok
    end
  end

  # the channel id (join key for WorkbenchChatbot) - a stable `19:...@thread.tacv2` id, distinct from the
  # conversation id which also carries the thread/message context used when replying.
  defp channel_id(%{"channelData" => %{"channel" => %{"id" => id}}}) when is_binary(id), do: id
  defp channel_id(%{"channelData" => %{"teamsChannelId" => id}}) when is_binary(id), do: id
  defp channel_id(activity), do: conversation_id(activity)

  defp conversation_id(%{"conversation" => %{"id" => id}}) when is_binary(id), do: id
  defp conversation_id(_), do: nil

  defp clean_text(%{"text" => text}) when is_binary(text) do
    text
    |> String.replace(~r/<at\b[^>]*>.*?<\/at>/s, "")
    |> String.trim()
  end
  defp clean_text(_), do: ""

  defp filter(channels, query) when is_binary(query) do
    case String.trim(query) |> String.downcase() do
      q when byte_size(q) > 0 ->
        Enum.filter(channels, &String.contains?(String.downcase(&1.name || ""), q))
      _ -> channels
    end
  end
  defp filter(channels, _), do: channels
end
