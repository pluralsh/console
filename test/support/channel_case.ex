defmodule ConsoleWeb.ChannelCase do
  @moduledoc """
  This module defines the test case to be used by
  channel tests.

  Such tests rely on `Phoenix.ChannelTest` and also
  import other functionality to make it easier
  to build common data structures and query the data layer.

  Finally, if the test case interacts with the database,
  it cannot be async. For this reason, every test runs
  inside a transaction which is reset at the beginning
  of the test unless the test case is marked as async.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      # Import conveniences for testing with channels
      import Phoenix.ChannelTest
      use Absinthe.Phoenix.SubscriptionTest, schema: Console.GraphQl
      import Console.Factory
      import Console.TestHelpers

      # The default endpoint for testing
      @endpoint ConsoleWeb.Endpoint

      def establish_socket(user) do
        {:ok, socket} = mk_socket(user)
        Absinthe.Phoenix.SubscriptionTest.join_absinthe(socket)
      end

      def mk_socket(user) do
        {:ok, token, _} = Console.Guardian.encode_and_sign(user)
        connect(ConsoleWeb.UserSocket, %{"token" => "Bearer #{token}"}, connect_info: %{})
      end

      def cluster_socket(cluster) do
        connect(ConsoleWeb.ExternalSocket, %{"token" => cluster.deploy_token}, connect_info: %{})
      end
    end
  end

  setup tags do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Console.Repo)

    unless tags[:async] do
      Ecto.Adapters.SQL.Sandbox.mode(Console.Repo, {:shared, self()})
    end
    :ok
  end
end
