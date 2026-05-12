defmodule Console.AI.MCP.ClientSupervisorTest do
  use ExUnit.Case, async: true

  alias Console.AI.MCP.ClientSupervisor

  describe "url_arguments/1" do
    test "base_url is always the scheme + host portion" do
      args = ClientSupervisor.url_arguments("https://example.com/some/path?x=1")

      assert args[:base_url] == "https://example.com"
    end

    test "preserves path as mcp_path" do
      args = ClientSupervisor.url_arguments("https://example.com/some/path")

      assert args[:mcp_path] == "/some/path"
    end

    test "preserves path query string as mcp_path" do
      args = ClientSupervisor.url_arguments("https://example.com/some/path?x=1&y=2")

      assert args[:mcp_path] == "/some/path?x=1&y=2"
    end

    test "uses root path when URL has no path" do
      args = ClientSupervisor.url_arguments("https://example.com")

      assert args[:mcp_path] == "/"
    end
  end
end
