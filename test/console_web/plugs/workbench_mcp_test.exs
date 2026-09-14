defmodule ConsoleWeb.Plugs.WorkbenchMCPTest do
  use ConsoleWeb.ConnCase, async: false
  use Mimic
  alias Console.Schema.WorkbenchTool.Configuration
  alias Console.Schema.WorkbenchTool.Configuration.HttpConfiguration

  # anubis runs tool calls in its own process, so stubs have to be global to reach them
  setup :set_mimic_global

  @version "2025-06-18"

  @input_schema %{
    "type" => "object",
    "properties" => %{"query" => %{"type" => "string", "description" => "the search query"}},
    "required" => ["query"]
  }

  describe "authorization" do
    test "it will 401 without credentials" do
      bench = insert(:workbench)

      build_conn()
      |> mcp_headers()
      |> post("/mcp/workbench/#{bench.id}", Jason.encode!(initialize()))
      |> response(401)
    end

    test "it will 403 for a user without read access" do
      bench = insert(:workbench)

      request(insert(:user), bench, initialize())
      |> response(403)
    end

    test "it will 404 for an unknown workbench" do
      request(admin(), %{id: Ecto.UUID.generate()}, initialize())
      |> response(404)
    end

    test "it will 404 for a malformed workbench id" do
      request(admin(), %{id: "not-a-uuid"}, initialize())
      |> response(404)
    end
  end

  describe "tools/list" do
    test "it exposes read-only tools with their schemas intact" do
      user = admin()
      bench = insert(:workbench)
      get = http_tool(bench, :get)
      post = http_tool(bench, :post)

      {user, bench, session} = handshake(user, bench)
      %{"result" => %{"tools" => tools}} = call(user, bench, session, "tools/list", %{})

      names = Enum.map(tools, & &1["name"])
      assert "http_integration_#{get.name}" in names
      refute "http_integration_#{post.name}" in names

      tool = Enum.find(tools, & &1["name"] == "http_integration_#{get.name}")
      # the configured schema is advertised verbatim under the wrapper the changeset casts
      # off.  anubis would otherwise run this through Peri and mangle it into nested garbage
      assert tool["inputSchema"] == %{
        "type" => "object",
        "properties" => %{"input" => @input_schema},
        "required" => ["input"]
      }
      assert tool["annotations"]["readOnlyHint"]
    end

    test "it won't expose function tools, which are gated behind an approval flow" do
      user = admin()
      bench = insert(:workbench)
      plain = http_tool(bench, :get)
      fun = http_tool(bench, :get, function: true)

      {user, bench, session} = handshake(user, bench)
      %{"result" => %{"tools" => tools}} = call(user, bench, session, "tools/list", %{})

      names = Enum.map(tools, & &1["name"])
      assert "http_integration_#{plain.name}" in names
      refute "http_integration_#{fun.name}" in names
    end

    test "it can be narrowed by tool name" do
      user = admin()
      bench = insert(:workbench)
      first = http_tool(bench, :get)
      second = http_tool(bench, :get)

      {user, bench, session} = handshake(user, bench, "?tools=http_integration_#{first.name}")
      %{"result" => %{"tools" => tools}} =
        call(user, bench, session, "tools/list", %{}, "?tools=http_integration_#{first.name}")

      assert Enum.map(tools, & &1["name"]) == ["http_integration_#{first.name}"]
      refute "http_integration_#{second.name}" in Enum.map(tools, & &1["name"])
    end

    test "it rejects an unknown category filter" do
      bench = insert(:workbench)

      request(admin(), bench, initialize(), query: "?categories=bogus")
      |> response(400)
    end
  end

  describe "tools/call" do
    test "it dispatches through the tool's implementation" do
      user = admin()
      bench = insert(:workbench)
      tool = http_tool(bench, :get)

      me = self()
      expect(Req, :request, fn opts ->
        send(me, {:req, opts})
        {:ok, %Req.Response{status: 200, body: "some results"}}
      end)

      {user, bench, session} = handshake(user, bench)

      %{"result" => result} =
        call(user, bench, session, "tools/call", %{
          "name" => "http_integration_#{tool.name}",
          "arguments" => %{"input" => %{"query" => "postgres"}}
        })

      refute result["isError"]
      assert hd(result["content"])["text"] =~ "some results"

      assert_receive {:req, opts}
      assert opts[:method] == :get
      assert opts[:url] == "https://example.com/search"
      # the body template renders off `input`, so this pins down the wrapper semantics too
      assert opts[:body] =~ "postgres"
    end

    test "it rejects arguments that fail the tool's changeset" do
      user = admin()
      bench = insert(:workbench)
      tool = http_tool(bench, :get)

      {user, bench, session} = handshake(user, bench)

      %{"error" => error} =
        call(user, bench, session, "tools/call", %{
          "name" => "http_integration_#{tool.name}",
          "arguments" => %{}
        })

      assert error["code"] == -32602
    end

    test "it won't run a session against a workbench it wasn't bound to" do
      user = admin()
      bound = insert(:workbench)
      other = insert(:workbench)
      tool = http_tool(bound, :get)
      http_tool(other, :get)

      {user, bound, session} = handshake(user, bound)

      %{"error" => error} =
        call(user, other, session, "tools/call", %{
          "name" => "http_integration_#{tool.name}",
          "arguments" => %{"input" => %{"query" => "postgres"}}
        })

      assert error["message"] =~ "not bound"
      refute bound.id == other.id
    end
  end

  defp admin(), do: insert(:user, roles: %{admin: true})

  defp http_tool(bench, method, opts \\ []) do
    tool = insert(:workbench_tool,
      tool: :http,
      configuration: %Configuration{
        http: %HttpConfiguration{
          url: "https://example.com/search",
          method: method,
          function: Keyword.get(opts, :function, false),
          body: ~s({"q": "{{ input.query }}"}),
          input_schema: @input_schema
        }
      }
    )

    insert(:workbench_tool_association, workbench: bench, tool: tool)
    tool
  end

  # runs the initialize/initialized handshake and hands back the session id
  defp handshake(user, bench, query \\ "") do
    conn = request(user, bench, initialize(), query: query)
    assert json_response(conn, 200)
    [session] = get_resp_header(conn, "mcp-session-id")

    request(user, bench, %{
      "jsonrpc" => "2.0",
      "method" => "notifications/initialized",
      "params" => %{}
    }, session: session, query: query)

    {user, bench, session}
  end

  defp call(user, bench, session, method, params, query \\ "") do
    request(user, bench, %{
      "jsonrpc" => "2.0",
      "id" => System.unique_integer([:positive]),
      "method" => method,
      "params" => params
    }, session: session, query: query)
    |> json_response(200)
  end

  defp initialize() do
    %{
      "jsonrpc" => "2.0",
      "id" => 1,
      "method" => "initialize",
      "params" => %{
        "protocolVersion" => @version,
        "capabilities" => %{},
        "clientInfo" => %{"name" => "test-client", "version" => "1.0.0"}
      }
    }
  end

  defp request(user, bench, body, opts \\ []) do
    build_conn()
    |> add_auth_headers(user)
    |> mcp_headers()
    |> session_header(opts[:session])
    |> post("/mcp/workbench/#{bench.id}#{opts[:query]}", Jason.encode!(body))
  end

  defp mcp_headers(conn) do
    conn
    |> put_req_header("content-type", "application/json")
    # anubis streams the reply back over sse if the client will take it, so ask for plain json
    |> put_req_header("accept", "application/json")
  end

  defp session_header(conn, nil), do: conn
  defp session_header(conn, session), do: put_req_header(conn, "mcp-session-id", session)
end
