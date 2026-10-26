defmodule Console.Chat.Teams.Connector do
  @moduledoc """
  Posts replies to Teams via the Bot Framework connector API.

  With an activity id this calls Reply to Activity
  (`POST {serviceUrl}/v3/conversations/{conversationId}/activities/{activityId}`), which threads the post
  under the message that started the job. Without one it sends to the conversation
  (`POST {serviceUrl}/v3/conversations/{conversationId}/activities`).

  This is the correct outbound path for a bot responding to a mention - application-only Microsoft Graph
  posting to standard channels is restricted by Microsoft to migration scenarios.
  """
  alias Console.Chat.Teams.Token
  alias Console.Schema.WorkbenchTool.Configuration.TeamsConnection

  @spec reply(struct(), binary, binary, binary, binary | nil) :: {:ok, map} | {:error, binary}
  def reply(conn, service_url, conversation_id, text, activity_id \\ nil)

  def reply(%TeamsConnection{client_id: cid, client_secret: secret, tenant_id: tid}, service_url, conversation_id, text, activity_id)
      when is_binary(service_url) and is_binary(conversation_id) and is_binary(text) do
    with {:ok, token} <- Token.connector_token(cid, secret, tid) do
      url = activities_url(service_url, conversation_id, activity_id)
      post(url, token, %{"type" => "message", "text" => text})
    end
  end
  def reply(_, _, _, _, _), do: {:error, "teams reply is missing connection config or reply coordinates"}

  defp activities_url(service_url, conversation_id, activity_id)
       when is_binary(activity_id) and activity_id != "" do
    "#{activities_url(service_url, conversation_id, nil)}/#{encode(activity_id)}"
  end
  defp activities_url(service_url, conversation_id, _) do
    "#{String.trim_trailing(service_url, "/")}/v3/conversations/#{encode(conversation_id)}/activities"
  end

  defp encode(value), do: URI.encode(value, &URI.char_unreserved?/1)

  defp post(url, token, body) do
    case Req.post(url, auth: {:bearer, token}, json: body) do
      {:ok, %Req.Response{status: s, body: body}} when s in 200..299 -> {:ok, ensure_map(body)}
      {:ok, %Req.Response{status: s, body: body}} -> {:error, "teams connector returned #{s}: #{inspect(body)}"}
      {:error, err} -> {:error, "teams connector request failed: #{inspect(err)}"}
    end
  end

  defp ensure_map(body) when is_map(body), do: body
  defp ensure_map(_), do: %{}
end
