defmodule Console.Users.AccessTokens do
  alias Console.Schema.AccessToken.Scope

  @spec scopes_match?([Scope.t], binary, binary | nil) :: boolean
  def scopes_match?(scopes, api, id) do
    Enum.all?(scopes, &matches_api?(&1, api) && matches_id?(&1, id))
  end

  defp matches_api?(%Scope{api: api}, api2) when is_binary(api), do: api == api2
  defp matches_api?(%Scope{apis: [_ | _] = apis}, api), do: Enum.member?(apis, api)
  defp matches_api?(%Scope{api: nil, apis: nil}, _), do: true
  defp matches_api?(_, _), do: false

  defp matches_id?(_, nil), do: true
  defp matches_id?(%Scope{identifier: "*"}, _), do: true
  defp matches_id?(%Scope{ids: ["*"]}, _), do: true
  defp matches_id?(%Scope{ids: [_ | _] = ids}, id), do: Enum.member?(ids, id)
  defp matches_id?(%Scope{identifier: id}, id2) when is_binary(id), do: id == id2
  defp matches_id?(%Scope{identifier: nil, ids: nil}, _), do: true
  defp matches_id?(_, _), do: false
end
