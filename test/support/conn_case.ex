defmodule ConsoleWeb.ConnCase do
  @moduledoc """
  This module defines the test case to be used by
  tests that require setting up a connection.

  Such tests rely on `Phoenix.ConnTest` and also
  import other functionality to make it easier
  to build common data structures and query the data layer.

  Finally, if the test case interacts with the database,
  it cannot be async. For this reason, every test runs
  inside a transaction which is reset at the beginning
  of the test unless the test case is marked as async.
  """

  use ExUnit.CaseTemplate
  import Plug.Conn
  alias Console.Schema.{User, Cluster}

  using do
    quote do
      # Import conveniences for testing with connections
      use Phoenix.ConnTest
      alias ConsoleWeb.Router.Helpers, as: Routes
      import Console.Factory
      import Console.TestHelpers
      import ConsoleWeb.ConnCase

      # The default endpoint for testing
      @endpoint ConsoleWeb.Endpoint
    end
  end

  setup tags do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Console.Repo)

    unless tags[:async] do
      Ecto.Adapters.SQL.Sandbox.mode(Console.Repo, {:shared, self()})
    end

    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end

  def add_auth_headers(conn, %User{} = user) do
    {:ok, token, _} = Console.Guardian.encode_and_sign(user)
    put_req_header(conn, "authorization", "Bearer #{token}")
  end
  def add_auth_headers(conn, %Cluster{deploy_token: token}),
    do: put_req_header(conn, "authorization", "Token #{token}")
end
