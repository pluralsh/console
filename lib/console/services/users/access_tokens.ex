defmodule Console.Users.AccessTokens do
  alias Console.Schema.AccessToken.Scope

  @spec scopes_match?([Scope.t], binary, binary) :: boolean
  def scopes_match?(scopes, api, id), do: !missing_scopes(scopes, api, id)

  defp missing_scopes(scopes, api, id) do
    Enum.filter(scopes, &matches_api?(&1, api))
    |> Enum.filter(&matches_id?(&1, id))
    |> Enum.empty?()
  end

  defp matches_api?(%Scope{api: api}, api), do: true
  defp matches_api?(%Scope{apis: [_ | _] = apis}, api), do: Enum.member?(apis, api)
  defp matches_api?(_, _), do: false

  defp matches_id?(_, "*"), do: true
  defp matches_id?(%Scope{identifier: nil}, _), do: true
  defp matches_id?(%Scope{identifier: id}, id), do: true
  defp matches_id?(%Scope{ids: [_ | _] = ids}, id), do: Enum.member?(ids, id)
  defp matches_id?(_, _), do: false
end
