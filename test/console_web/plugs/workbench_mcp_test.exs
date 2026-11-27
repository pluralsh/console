defmodule ConsoleWeb.Plugs.WorkbenchMCPTest do
  use ConsoleWeb.ConnCase, async: false
  use Mimic
  alias Console.PseudoFS
  alias Console.Schema.WorkbenchTool.Configuration
  alias Console.Schema.WorkbenchTool.Configuration.HttpConfiguration
  alias Pseudofs.V1.StatResponse

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

  describe "devbox console tokens" do
    test "they reach the instance's own workbench as its owner" do
      inst = insert(:devbox_instance, user: admin())
      {:ok, token, _} = Console.Devboxes.Credentials.console_token(inst)

      devbox_request(token, inst.workbench_id)
      |> response(200)
    end

    test "they can't reach other workbenches, even ones the owner can read" do
      inst = insert(:devbox_instance, user: admin())
      {:ok, token, _} = Console.Devboxes.Credentials.console_token(inst)

      devbox_request(token, insert(:workbench).id)
      |> response(403)
    end

    test "they stop working once the instance ends" do
      inst = insert(:devbox_instance, user: admin())
      {:ok, token, _} = Console.Devboxes.Credentials.console_token(inst)
      {:ok, _} = Console.Devboxes.end_instance(inst, :cancelled, "test")

      devbox_request(token, inst.workbench_id)
      |> response(401)
    end

    test "they need the workbench_mcp scope" do
      inst = insert(:devbox_instance, user: admin())
      {:ok, token, _} = Console.Devboxes.Credentials.mint_ai_proxy_token(inst)

      devbox_request(token, inst.workbench_id)
      |> response(401)
    end

    test "they aren't a console login" do
      inst = insert(:devbox_instance, user: admin())
      {:ok, token, _} = Console.Devboxes.Credentials.console_token(inst)

      build_conn()
      |> put_req_header("authorization", "Bearer #{token}")
      |> put_req_header("content-type", "application/json")
      |> post("/gql", Jason.encode!(%{query: "query { me { id } }"}))
      |> json_response(200)
      |> case do
        %{"data" => %{"me" => nil}, "errors" => [%{"message" => "unauthenticated"}]} -> :ok
        resp -> flunk("devbox token authenticated /gql: #{inspect(resp)}")
      end
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

    test "it can be narrowed by the advertised MCP name when the tool name contains dots" do
      user = admin()
      bench = insert(:workbench)
      dotted = http_tool(bench, :get, name: "search.prod")
      other = http_tool(bench, :get)

      query = "?tools=http_integration_search_prod"
      {user, bench, session} = handshake(user, bench, query)
      %{"result" => %{"tools" => tools}} = call(user, bench, session, "tools/list", %{}, query)

      assert Enum.map(tools, & &1["name"]) == ["http_integration_search_prod"]
      refute "http_integration_#{other.name}" in Enum.map(tools, & &1["name"])
      assert dotted.name == "search.prod"
    end

    test "it errors when distinct tool names sanitize to the same MCP name" do
      user = admin()
      bench = insert(:workbench)
      http_tool(bench, :get, name: "my.tool")
      http_tool(bench, :get, name: "my_tool")

      {user, bench, session} = handshake(user, bench)
      %{"error" => error} = call(user, bench, session, "tools/list", %{})

      assert error["message"] =~ "collision"
      assert error["message"] =~ "http_integration_my_tool"
    end

    test "it rejects an unknown category filter" do
      bench = insert(:workbench)

      request(admin(), bench, initialize(), query: "?categories=bogus")
      |> response(400)
    end

    test "it won't list tools as a different user of the same workbench" do
      owner = admin()
      other = admin()
      bench = insert(:workbench)
      http_tool(bench, :get)

      {_owner, bench, session} = handshake(owner, bench)

      %{"error" => error} = call(other, bench, session, "tools/list", %{})

      assert error["message"] =~ "not bound"
      refute owner.id == other.id
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

    test "it enforces workbench admission policies on tool calls" do
      user = admin()
      bench = insert(:workbench)
      tool = http_tool(bench, :get)
      policy = insert(:policy, policy: """
      package plrl.wb.admission

      sample := 0

      deny[{"message": "blocked"}] if {
        true
      }
      """)
      insert(:workbench_policy, workbench: bench, policy: policy, matches: %{regexes: [".*"]})

      {user, bench, session} = handshake(user, bench)

      %{"error" => error} =
        call(user, bench, session, "tools/call", %{
          "name" => "http_integration_#{tool.name}",
          "arguments" => %{"input" => %{"query" => "postgres"}}
        })

      assert error["message"] =~ "Policy denied"
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

    test "it won't run a session as a different user of the same workbench" do
      owner = admin()
      other = admin()
      bench = insert(:workbench)
      tool = http_tool(bench, :get)

      {_owner, bench, session} = handshake(owner, bench)

      %{"error" => error} =
        call(other, bench, session, "tools/call", %{
          "name" => "http_integration_#{tool.name}",
          "arguments" => %{"input" => %{"query" => "postgres"}}
        })

      assert error["message"] =~ "not bound"
      refute owner.id == other.id
    end
  end

  describe "filesystem tools" do
    setup do
      stub(PseudoFS, :enabled?, fn -> true end)
      :ok
    end

    @read_tools ~w(workbench_list_files workbench_stat_file workbench_read_file workbench_glob_files workbench_grep_files)
    @write_tools ~w(workbench_write_file workbench_mkdir workbench_move_file workbench_delete_file)

    test "readers can list and read, and do not see write tools" do
      user = insert(:user)
      bench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      post = http_tool(bench, :post)
      wid = bench.id

      expect(PseudoFS, :iterdir, fn ^wid, "/reports" ->
        {:ok, [%{path: "/reports/a.md", name: "a.md", kind: :file}]}
      end)
      expect(PseudoFS, :stat, fn ^wid, "/reports/a.md" ->
        {:ok, %StatResponse{kind: :FILE, size: 5}}
      end)
      expect(PseudoFS, :read_text, fn ^wid, "/reports/a.md" -> {:ok, "hello"} end)
      expect(PseudoFS, :glob, fn ^wid, "/**/*.md", 0 ->
        {:ok, [%{path: "/reports/a.md", name: "a.md", kind: :file}]}
      end)
      expect(PseudoFS, :grep, fn ^wid, "/", "hello", _ ->
        {:ok, [%{
          path: "/reports/a.md",
          line_number: 2,
          line: "hello",
          before: [%{line_number: 1, text: "prev"}],
          after: [%{line_number: 3, text: "next"}]
        }]}
      end)

      {user, bench, session} = handshake(user, bench)
      %{"result" => %{"tools" => tools}} = call(user, bench, session, "tools/list", %{})
      names = Enum.map(tools, & &1["name"])

      assert Enum.all?(@read_tools, &(&1 in names))
      refute Enum.any?(@write_tools, &(&1 in names))
      refute "http_integration_#{post.name}" in names
      assert Enum.find(tools, & &1["name"] == "workbench_read_file")["annotations"]["readOnlyHint"]

      %{"result" => list} = call(user, bench, session, "tools/call", %{
        "name" => "workbench_list_files",
        "arguments" => %{"path" => "/workbench/reports"}
      })
      refute list["isError"]
      assert hd(list["content"])["text"] =~ "/workbench/reports/a.md"

      %{"result" => read} = call(user, bench, session, "tools/call", %{
        "name" => "workbench_read_file",
        "arguments" => %{"path" => "/workbench/reports/a.md"}
      })
      refute read["isError"]
      assert hd(read["content"])["text"] == "hello"

      %{"result" => glob} = call(user, bench, session, "tools/call", %{
        "name" => "workbench_glob_files",
        "arguments" => %{"pattern" => "/workbench/**/*.md"}
      })
      assert hd(glob["content"])["text"] =~ "/workbench/reports/a.md"

      %{"result" => grep} = call(user, bench, session, "tools/call", %{
        "name" => "workbench_grep_files",
        "arguments" => %{"pattern" => "hello"}
      })
      assert hd(grep["content"])["text"] ==
        "/workbench/reports/a.md-1-prev\n/workbench/reports/a.md:2:hello\n/workbench/reports/a.md-3-next"
    end

    test "a file larger than the inline cap returns a download url" do
      user = insert(:user)
      bench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      wid = bench.id

      expect(PseudoFS, :stat, fn ^wid, "/reports/big.txt" ->
        {:ok, %StatResponse{kind: :FILE, size: 60_000}}
      end)

      {user, bench, session} = handshake(user, bench)
      %{"result" => read} = call(user, bench, session, "tools/call", %{
        "name" => "workbench_read_file",
        "arguments" => %{"path" => "/workbench/reports/big.txt"}
      })

      refute read["isError"]
      assert hd(read["content"])["text"] =~ "/v1/workbenches/files/download?token="
    end

    test "writers can create a file and readers cannot call write tools" do
      writer = insert(:user)
      reader = insert(:user)
      bench = insert(:workbench, write_bindings: [%{user_id: writer.id}], read_bindings: [%{user_id: reader.id}])
      post = http_tool(bench, :post)
      wid = bench.id

      expect(PseudoFS, :write_file, fn ^wid, "/notes/a.md", ["hello"] -> {:ok, 5} end)
      expect(PseudoFS, :write_file, fn ^wid, "/notes/empty.md", [""] -> {:ok, 0} end)
      expect(PseudoFS, :mkdir, fn ^wid, "/notes", [parents: true, exist_ok: true] -> :ok end)
      expect(PseudoFS, :rename, fn ^wid, "/notes/a.md", "/notes/b.md" -> {:ok, "/notes/b.md"} end)
      expect(PseudoFS, :delete, fn ^wid, "/notes/b.md" -> :ok end)
      stub(PseudoFS, :stat, fn
        ^wid, "/notes/a.md" -> {:ok, %StatResponse{kind: :FILE, size: 5}}
        ^wid, "/notes/empty.md" -> {:ok, %StatResponse{kind: :FILE, size: 0}}
        ^wid, "/notes" -> {:ok, %StatResponse{kind: :DIRECTORY, size: 0}}
        ^wid, "/notes/b.md" -> {:ok, %StatResponse{kind: :FILE, size: 5}}
      end)

      {writer, bench, session} = handshake(writer, bench)
      %{"result" => %{"tools" => tools}} = call(writer, bench, session, "tools/list", %{})
      names = Enum.map(tools, & &1["name"])
      assert Enum.all?(@write_tools, &(&1 in names))
      refute "http_integration_#{post.name}" in names
      refute Enum.find(tools, & &1["name"] == "workbench_write_file")["annotations"]["readOnlyHint"]

      %{"result" => written} = call(writer, bench, session, "tools/call", %{
        "name" => "workbench_write_file",
        "arguments" => %{"path" => "/workbench/notes/a.md", "content" => "hello"}
      })
      refute written["isError"]
      assert hd(written["content"])["text"] =~ "/workbench/notes/a.md"

      %{"result" => cleared} = call(writer, bench, session, "tools/call", %{
        "name" => "workbench_write_file",
        "arguments" => %{"path" => "/workbench/notes/empty.md", "content" => ""}
      })
      refute cleared["isError"]
      assert hd(cleared["content"])["text"] =~ "/workbench/notes/empty.md"

      for {name, args} <- [
        {"workbench_mkdir", %{"path" => "/workbench/notes"}},
        {"workbench_move_file", %{"source" => "/workbench/notes/a.md", "target" => "/workbench/notes/b.md"}},
        {"workbench_delete_file", %{"path" => "/workbench/notes/b.md"}}
      ] do
        %{"result" => result} = call(writer, bench, session, "tools/call", %{"name" => name, "arguments" => args})
        refute result["isError"]
      end

      {reader, bench, reader_session} = handshake(reader, bench)
      %{"result" => %{"tools" => reader_tools}} = call(reader, bench, reader_session, "tools/list", %{})
      refute "workbench_write_file" in Enum.map(reader_tools, & &1["name"])

      %{"error" => error} = call(reader, bench, reader_session, "tools/call", %{
        "name" => "workbench_write_file",
        "arguments" => %{"path" => "/workbench/notes/a.md", "content" => "nope"}
      })
      assert error["message"] == "Invalid params"
      assert String.downcase(error["data"]["message"]) =~ "tool not found"
    end

    test "the filesystem category returns only file tools" do
      user = admin()
      bench = insert(:workbench)
      http = http_tool(bench, :get)

      {user, bench, session} = handshake(user, bench, "?categories=filesystem")
      %{"result" => %{"tools" => tools}} =
        call(user, bench, session, "tools/list", %{}, "?categories=filesystem")

      names = Enum.map(tools, & &1["name"])
      assert Enum.all?(@read_tools ++ @write_tools, &(&1 in names))
      refute "http_integration_#{http.name}" in names
    end
  end

  defp admin(), do: insert(:user, roles: %{admin: true})

  defp http_tool(bench, method, opts \\ []) do
    attrs =
      [
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
      ]
      |> Keyword.merge(Keyword.take(opts, [:name]))

    tool = insert(:workbench_tool, attrs)

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

  defp devbox_request(token, workbench_id) do
    build_conn()
    |> put_req_header("authorization", "Bearer #{token}")
    |> mcp_headers()
    |> post("/mcp/workbench/#{workbench_id}", Jason.encode!(initialize()))
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
