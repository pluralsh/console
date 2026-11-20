defmodule ConsoleWeb.GraphqlWSSocketTest do
  use Console.DataCase, async: true
  alias ConsoleWeb.GraphqlWSSocket

  defp socket() do
    %Absinthe.GraphqlWS.Socket{
      absinthe: %{opts: [context: %{}]},
      connect_info: %{},
      endpoint: ConsoleWeb.Endpoint,
      handler: GraphqlWSSocket,
      keepalive: 30_000,
      pubsub: Console.PubSub
    }
  end

  describe "#handle_init/2" do
    test "it accepts a user jwt" do
      user = insert(:user)
      {:ok, token, _} = Console.Guardian.encode_and_sign(user)

      {:ok, %{name: email}, _} = GraphqlWSSocket.handle_init(%{"token" => "Bearer #{token}"}, socket())

      assert email == user.email
    end

    test "it accepts an access token, with or without a scheme" do
      token = insert(:access_token)

      {:ok, %{name: email}, _} = GraphqlWSSocket.handle_init(%{"token" => token.token}, socket())
      assert email == token.user.email

      {:ok, %{name: ^email}, _} = GraphqlWSSocket.handle_init(%{"Authorization" => "Token #{token.token}"}, socket())
    end

    test "it rejects unknown tokens without crashing" do
      {:error, _, _} = GraphqlWSSocket.handle_init(%{"token" => "console-bogus"}, socket())
      {:error, _, _} = GraphqlWSSocket.handle_init(%{"token" => "not-a-jwt"}, socket())
      {:error, _, _} = GraphqlWSSocket.handle_init(%{}, socket())
    end
  end
end
