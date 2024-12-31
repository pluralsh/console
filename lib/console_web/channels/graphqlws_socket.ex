defmodule ConsoleWeb.GraphqlWSSocket do
  use Absinthe.GraphqlWS.Socket,
    schema: Console.GraphQl

  @impl Absinthe.GraphqlWS.Socket
  def handle_init(params, socket) do
    with {:ok, token} <- fetch_token(params),
         {:ok, current_user, _claims} = Console.Guardian.resource_from_token(token) do
      {:ok, %{name: current_user.email}, assign_context(socket, current_user: current_user)}
    else
      _ -> {:error, %{}, socket}
    end
  end

  def fetch_token(%{"Authorization" => "Bearer " <> token}), do: {:ok, token}
  def fetch_token(%{"token" => "Bearer " <> token}), do: {:ok, token}
  def fetch_token(%{"token" => token}), do: {:ok, token}
  def fetch_token(_), do: {:error, :notoken}
end
