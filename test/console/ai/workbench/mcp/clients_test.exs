defmodule Console.AI.Workbench.MCP.ClientsTest do
  use Console.DataCase, async: false
  alias Console.AI.Workbench.MCP
  alias Console.AI.Workbench.MCP.Clients
  alias Console.Schema.{McpServer, WorkbenchTool}

  setup do
    on_exit(fn ->
      for {_, pid, _, _} <- DynamicSupervisor.which_children(Clients),
        do: DynamicSupervisor.terminate_child(Clients, pid)
    end)
  end

  describe "ensure_started/1" do
    test "shares one client across every tool and job using the same server" do
      server = insert(:mcp_server, url: "http://localhost:3001/mcp", protocol: :streamable_http)
      first = insert(:workbench_tool, tool: :mcp, name: "first", mcp_server: server)
      second = insert(:workbench_tool, tool: :mcp, name: "second", mcp_server: server)

      {:ok, pid} = Clients.ensure_started(first)
      assert {:ok, ^pid} = Clients.ensure_started(second)
      assert {:ok, ^pid} = Clients.ensure_started(first)

      assert Clients.key(first) == {:mcp_server, server.id}
      assert Clients.name(first) == Clients.name(second)
      assert is_pid(GenServer.whereis(Clients.name(first)))
    end

    test "keys hosted integrations by their workbench tool" do
      tool = insert(:workbench_tool, tool: :linear, configuration: %{linear: %{access_token: "token"}})

      {:ok, _} = Clients.ensure_started(tool)

      assert Clients.key(tool) == {:workbench_tool, tool.id}
      assert is_pid(GenServer.whereis(Clients.name(tool)))
    end

    test "replaces a running client when the server configuration changes" do
      server = insert(:mcp_server, url: "http://localhost:3001/mcp", protocol: :streamable_http)
      tool = insert(:workbench_tool, tool: :mcp, mcp_server: server)

      {:ok, pid} = Clients.ensure_started(tool)
      ref = Process.monitor(pid)

      {:ok, server} = McpServer.changeset(server, %{url: "http://localhost:3002/mcp"}) |> Repo.update()
      {:ok, replacement} = Clients.ensure_started(%{tool | mcp_server: server})

      assert_receive {:DOWN, ^ref, :process, ^pid, _}
      refute replacement == pid
    end

    test "returns an error rather than raising when the transport can't be configured" do
      server = insert(:mcp_server,
        url: "http://localhost:3001/mcp",
        protocol: :streamable_http,
        authentication: %{plural: true}
      )
      tool = insert(:workbench_tool, tool: :mcp, name: "nobot", mcp_server: server)

      assert {:error, msg} = Clients.ensure_started(tool)
      assert msg =~ "failed to configure MCP client for nobot"
    end
  end

  describe "expiry" do
    test "an idle client exits for good and the next caller starts a fresh one" do
      server = insert(:mcp_server, url: "http://localhost:3001/mcp", protocol: :streamable_http)
      tool = insert(:workbench_tool, tool: :mcp, mcp_server: server)

      {:ok, pid} = Clients.ensure_started(tool)
      client = GenServer.whereis(Clients.name(tool))
      ref = Process.monitor(pid)
      client_ref = Process.monitor(client)

      :sys.replace_state(pid, fn state -> %{state | used: state.used - :timer.hours(1)} end)
      send(pid, :check)

      assert_receive {:DOWN, ^ref, :process, ^pid, :normal}
      assert_receive {:DOWN, ^client_ref, :process, ^client, _}
      assert DynamicSupervisor.which_children(Clients) == []

      {:ok, fresh} = Clients.ensure_started(tool)
      refute fresh == pid
    end
  end

  describe "MCP.start_clients/1" do
    test "only starts clients for MCP-backed tools" do
      server = insert(:mcp_server, url: "http://localhost:3001/mcp", protocol: :streamable_http)
      mcp = insert(:workbench_tool, tool: :mcp, mcp_server: server)
      http = insert(:workbench_tool, tool: :http, configuration: %{http: %{url: "https://example.com", method: :get}})

      {:ok, [pid]} = MCP.start_clients([mcp, http])
      assert {:ok, [^pid]} = MCP.start_clients(%{"mcp" => mcp, "http" => http})
    end
  end

  describe "MCP.transport/1" do
    test "plural-authenticated servers are called as the console bot" do
      bot("console")
      server = %McpServer{
        protocol: :streamable_http,
        url: "https://mcp.example.com/mcp",
        authentication: %McpServer.Authentication{plural: true}
      }

      {:streamable_http, opts} = MCP.transport(%WorkbenchTool{tool: :mcp, mcp_server: server})
      "Bearer " <> jwt = opts[:headers]["Authorization"]

      {:ok, claims} = Console.Jwt.MCP.exchange(jwt)
      assert claims["sub"] == Console.Services.Users.get_bot!("console").email
    end
  end
end
