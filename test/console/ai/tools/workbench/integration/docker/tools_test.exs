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
  @ecr_repository "docker/library/nginx"

  describe "search_tags/1" do
    test "searches a page of public Docker Hub tags" do
      assert {:ok, json} =
               SearchTags.implement(%SearchTags{
                 tool: docker_tool(),
                 repository_slug: @repository,
                 query: "alpine",
                 page_size: 50
               })

      assert %{"repository" => @repository, "tags" => tags, "next_cursor" => cursor} = Jason.decode!(json)
      assert length(tags) <= 50
      assert Enum.all?(tags, &String.contains?(&1, "alpine"))
      assert is_binary(cursor)
    end

    test "paginates public Docker Hub tags with a cursor" do
      assert_paginates(docker_tool(), @repository)
    end

    test "searches a page of public.ecr.aws tags" do
      assert {:ok, json} =
               SearchTags.implement(%SearchTags{
                 tool: ecr_public_tool(),
                 repository_slug: @ecr_repository,
                 query: "alpine",
                 page_size: 1000
               })

      assert %{"repository" => @ecr_repository, "tags" => [_ | _] = tags, "next_cursor" => cursor} =
               Jason.decode!(json)
      assert Enum.all?(tags, &String.contains?(&1, "alpine"))
      assert is_binary(cursor)
    end

    test "paginates public.ecr.aws tags with a cursor" do
      assert_paginates(ecr_public_tool(), @ecr_repository)
    end
  end

  defp assert_paginates(tool, repository) do
    search = %SearchTags{tool: tool, repository_slug: repository, page_size: 5}

    assert {:ok, first} = SearchTags.implement(search)
    assert %{"tags" => [_ | _] = page1, "next_cursor" => cursor} = Jason.decode!(first)
    assert length(page1) == 5
    assert is_binary(cursor)

    assert {:ok, second} = SearchTags.implement(%{search | cursor: cursor})
    assert %{"tags" => [_ | _] = page2} = Jason.decode!(second)
    assert length(page2) == 5
    assert MapSet.disjoint?(MapSet.new(page1), MapSet.new(page2))
  end

  describe "fetch_manifest/1" do
    test "fetches the manifest for a public.ecr.aws tag" do
      assert {:ok, json} =
               FetchManifest.implement(%FetchManifest{
                 tool: ecr_public_tool(),
                 repository_slug: @ecr_repository,
                 tag: "latest"
               })

      assert %{"manifest" => manifest} = Jason.decode!(json)
      assert manifest["schemaVersion"] == 2
    end

    test "fetches the manifest for a public Docker Hub tag" do
      assert {:ok, json} =
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

  defp ecr_public_tool do
    %WorkbenchTool{
      name: "ecr_public",
      tool: :docker,
      configuration: %Configuration{
        docker: %DockerConnection{
          url: "public.ecr.aws"
        }
      }
    }
  end
end
