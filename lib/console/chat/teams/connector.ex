defmodule Console.Chat.Teams.Connector do
  @moduledoc """
  Posts replies to Teams via the Bot Framework connector API
  (`POST {serviceUrl}/v3/conversations/{conversationId}/activities`).

  This is the correct outbound path for a bot responding to a mention - application-only Microsoft Graph
  posting to standard channels is restricted by Microsoft to migration scenarios, whereas the connector is
  purpose-built for bot replies and threads into the originating conversation automatically.
  """
  alias Console.Chat.Teams.Token
  alias Console.Schema.WorkbenchTool.Configuration.TeamsConnection

  @spec reply(struct(), binary, binary, binary) :: {:ok, map} | {:error, binary}
  def reply(%TeamsConnection{client_id: cid, client_secret: secret, tenant_id: tid}, service_url, conversation_id, text)
      when is_binary(service_url) and is_binary(conversation_id) and is_binary(text) do
    with {:ok, token} <- Token.connector_token(cid, secret, tid) do
      url = activities_url(service_url, conversation_id)
      post(url, token, %{"type" => "message", "text" => text})
    end
  end
  def reply(_, _, _, _), do: {:error, "teams reply is missing connection config or reply coordinates"}

  defp activities_url(service_url, conversation_id) do
    "#{String.trim_trailing(service_url, "/")}/v3/conversations/#{URI.encode(conversation_id, &URI.char_unreserved?/1)}/activities"
  end

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
