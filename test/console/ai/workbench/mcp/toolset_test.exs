defmodule Console.AI.Workbench.MCP.ToolsetTest do
  use Console.DataCase, async: true
  alias Console.AI.Tool
  alias Console.AI.Workbench.MCP.Toolset
  alias Console.AI.Tools.Workbench.Http
  alias Console.AI.Tools.Workbench.Integration.Docker.SearchTags
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.Configuration
  alias Console.Schema.WorkbenchTool.Configuration.HttpConfiguration

  describe "filter/2" do
    test "matches the advertised MCP name after sanitizing dots" do
      dotted = http("search.prod")
      other = http("other")

      names =
        Toolset.filter([dotted, other], {:names, ["http_integration_search_prod"]})
        |> Enum.map(&Tool.name/1)

      assert names == ["http_integration_search.prod"]
    end

    test "matches the raw tool name as well" do
      dotted = http("search.prod")
      other = http("other")

      names =
        Toolset.filter([dotted, other], {:names, ["http_integration_search.prod"]})
        |> Enum.map(&Tool.name/1)

      assert names == ["http_integration_search.prod"]
    end

    test "classifies docker/oci tools as both infrastructure and integration" do
      docker = %SearchTags{
        tool: %WorkbenchTool{
          name: "hub",
          tool: :docker,
          categories: [:integration]
        }
      }
      other = http("other")

      infra =
        Toolset.filter([docker, other], {:categories, [:infrastructure]})
        |> Enum.map(&Tool.name/1)

      integration =
        Toolset.filter([docker, other], {:categories, [:integration]})
        |> Enum.map(&Tool.name/1)

      assert infra == ["docker_hub_search_tags"]
      assert "docker_hub_search_tags" in integration
      assert "http_integration_other" in integration
    end
  end

  describe "mcp_index/1" do
    test "indexes by the sanitized MCP name" do
      tool = http("search.prod")

      assert {:ok, %{"http_integration_search_prod" => ^tool}} = Toolset.mcp_index([tool])
    end

    test "errors when distinct names sanitize to the same MCP name" do
      dotted = http("my.tool")
      underscored = http("my_tool")

      assert {:error, message} = Toolset.mcp_index([dotted, underscored])
      assert message =~ "collision"
      assert message =~ "http_integration_my.tool"
      assert message =~ "http_integration_my_tool"
      assert message =~ "both map to http_integration_my_tool"
    end
  end

  defp http(name) do
    %Http{
      tool: %WorkbenchTool{
        name: name,
        tool: :http,
        configuration: %Configuration{
          http: %HttpConfiguration{method: :get, url: "https://example.com"}
        }
      }
    }
  end
end
