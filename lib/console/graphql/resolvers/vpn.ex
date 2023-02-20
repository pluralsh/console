defmodule Console.GraphQl.Resolvers.VPN do
  alias Console.Services.VPN

  def list_peers(_, _) do
    VPN.list_peers()
    |> items_response()
  end

  def list_my_peers(_, %{context: %{current_user: user}}) do
    VPN.list_peers(user)
    |> items_response()
  end

  def get_peer(%{name: name}, %{context: %{current_user: user}}),
    do: VPN.get_peer(name, user)

  def create_peer(%{user_id: uid, name: name}, _) when is_binary(uid) do
    Console.Services.Users.get_user!(uid)
    |> VPN.create_peer(name)
  end
  def create_peer(%{email: email, name: name}, _) when is_binary(email),
    do: VPN.create_peer(email, name)
  def create_peer(_, _), do: {:error, "at least one of userId or name are required"}

  def delete_peer(%{name: name}, _), do: VPN.delete_peer(name)

  defp items_response({:ok, %{items: items}}), do: {:ok, items}
  defp items_response(err), do: err
end
