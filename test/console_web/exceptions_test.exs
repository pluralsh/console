defmodule ConsoleWeb.ExceptionsTest do
  use ExUnit.Case, async: true

  describe "DBConnection.ConnectionError Plug.Exception" do
    test "maps pool queue timeouts to too many requests" do
      error = DBConnection.ConnectionError.exception("connection not available", :queue_timeout)

      assert Plug.Exception.status(error) == 429
      assert Plug.Exception.actions(error) == []
    end

    test "leaves other connection errors as server errors" do
      error = DBConnection.ConnectionError.exception("connection failed")

      assert Plug.Exception.status(error) == 500
      assert Plug.Exception.actions(error) == []
    end
  end
end
