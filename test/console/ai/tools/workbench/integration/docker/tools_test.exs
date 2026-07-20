defmodule Console.AI.Tools.Workbench.Integration.Docker.ToolsTest do
  use ExUnit.Case, async: false

  alias Console.AI.Tools.Workbench.Integration.Docker.{
    FetchManifest,
    Tools,
    SearchTags
  }

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.Configuration
  alias Console.Schema.WorkbenchTool.Configuration.DockerConnection

  @repository "library/nginx"

  describe "search_tags/1" do
    test "searches public Docker Hub tags with a limit" do
      assert json =
               SearchTags.implement(%SearchTags{
                 tool: docker_tool(),
                 repository_slug: @repository,
                 query: "alpine",
                 limit: 3
               })

      assert %{"repository" => @repository, "tags" => tags} = Jason.decode!(json)
      assert length(tags) <= 3
      assert Enum.all?(tags, &String.contains?(&1, "alpine"))
    end
  end

  describe "fetch_manifest/1" do
    test "fetches the manifest for a public Docker Hub tag" do
      assert json =
               FetchManifest.implement(%FetchManifest{
                 tool: docker_tool(),
                 repository_slug: @repository,
                 tag: "latest"
               })

      assert %{"repository" => @repository, "tag" => "latest", "manifest" => manifest} =
               Jason.decode!(json)
      assert manifest["schemaVersion"] == 2
      assert is_list(manifest["layers"]) or is_list(manifest["manifests"])
    end
  end

  describe "expand/1" do
    test "only exposes broadly supported Docker registry tools" do
      tools = Tools.expand(docker_tool())

      assert [%SearchTags{}, %FetchManifest{}] = tools
    end
  end

  defp docker_tool do
    %WorkbenchTool{
      name: "dockerhub",
      tool: :docker,
      configuration: %Configuration{
        docker: %DockerConnection{
          url: "registry-1.docker.io"
        }
      }
    }
  end
end
