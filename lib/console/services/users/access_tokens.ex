defmodule Console.Users.AccessTokens do
  @spec scopes_match?([Console.Schema.AccessToken.Scope.t], binary, binary) :: boolean
  def scopes_match?(scopes, api, id), do: !missing_scopes(scopes, api, id)

  defp missing_scopes(scopes, api, id) do
    Enum.filter(scopes, & &1.api == api)
    |> Enum.filter(&matches_id?(&1, id))
    |> Enum.empty?()
  end

  defp matches_id?(%{identifier: nil}, _), do: true
  defp matches_id?(%{identifier: id}, id), do: true
  defp matches_id?(_, "*"), do: true
  defp matches_id?(_, _), do: false
end
