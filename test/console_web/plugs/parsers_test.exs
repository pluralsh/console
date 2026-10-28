defmodule ConsoleWeb.Plugs.ParsersTest do
  use ExUnit.Case, async: true
  import Plug.Test
  import Plug.Conn
  alias ConsoleWeb.Plugs.{Parsers, CachedParsers}

  @body ~s({"some": "json"})

  defp json_conn(path) do
    conn(:post, path, @body)
    |> put_req_header("content-type", "application/json")
  end

  describe "call/2" do
    test "it parses requests outside the skipped prefixes" do
      conn = Parsers.call(json_conn("/gql?a=b"), Parsers.init(skip: [~w(ext v1 webhooks)]))

      assert conn.body_params == %{"some" => "json"}
      assert conn.params == %{"some" => "json", "a" => "b"}
    end

    test "it leaves requests under a skipped prefix unread" do
      conn = Parsers.call(json_conn("/ext/v1/webhooks/github/id"), Parsers.init(skip: [~w(ext v1 webhooks)]))

      assert %Plug.Conn.Unfetched{} = conn.body_params
      assert {:ok, @body, _} = read_body(conn)
    end
  end

  describe "read_body/1" do
    test "it returns the exact body and merges query params" do
      {body, conn} = Parsers.read_body(json_conn("/ext/v1/states/terraform/id?ID=lock"))

      assert body == @body
      assert conn.params == %{"ID" => "lock"}
    end
  end

  describe "CachedParsers" do
    test "it keeps the exact body and parses it" do
      conn = CachedParsers.call(json_conn("/ext/v1/webhooks/github/id?a=b"), CachedParsers.init([]))

      assert conn.assigns.raw_body == @body
      assert conn.body_params == %{"some" => "json"}
      assert conn.params == %{"some" => "json", "a" => "b"}
    end

    test "it parses urlencoded bodies" do
      conn =
        conn(:post, "/ext/v1/webhooks/github/id", "payload=value")
        |> put_req_header("content-type", "application/x-www-form-urlencoded")
        |> CachedParsers.call(CachedParsers.init([]))

      assert conn.assigns.raw_body == "payload=value"
      assert conn.body_params == %{"payload" => "value"}
    end
  end
end
