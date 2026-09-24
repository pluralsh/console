defmodule Console.AI.Workbench.MCPTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Workbench.MCP
  alias Console.Schema.{McpServer, WorkbenchJob, WorkbenchTool}
  alias Console.Schema.DeploymentSettings.OauthToken

  test "initializes a workbench MCP transport with an exchanged OAuth token" do
    stub(Console.Cache, :get, fn _ ->
      %OAuth2.AccessToken{
        access_token: "mcp-access-token",
        expires_at: nil,
        refresh_token: nil,
        token_type: "Bearer",
        other_params: %{}
      }
    end)

    server = %McpServer{
      protocol: :streamable_http,
      url: "https://mcp.example.com/mcp",
      authentication: %McpServer.Authentication{
        oauth: %OauthToken{
          token_url: "https://identity.example.com/oauth2/token",
          client_id: "mcp-client",
          client_secret: "mcp-secret"
        }
      }
    }

    tool = %WorkbenchTool{tool: :mcp, mcp_server: server}

    assert {:streamable_http, options} = MCP.transport(tool, %WorkbenchJob{})
    assert options[:base_url] == "https://mcp.example.com"
    assert options[:headers] == %{"Authorization" => "Bearer mcp-access-token"}
  end
end
