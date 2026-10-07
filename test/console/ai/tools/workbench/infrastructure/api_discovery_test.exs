defmodule Console.AI.Tools.Workbench.Infrastructure.ApiDiscoveryTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Infrastructure.{ApiDiscovery, ApiSpec}
  alias Console.Deployments.Clusters

  setup :set_mimic_global

  describe "ApiDiscovery" do
    test "requires a cluster handle" do
      assert {:error, changeset} = Tool.validate(%ApiDiscovery{}, %{})
      assert Keyword.has_key?(changeset.errors, :cluster)
    end

    test "lists APIs discovered from the requested cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      expect(Clusters, :api_discovery, fn fetched ->
        assert fetched.id == cluster.id
        %{{"example.com", "v1", "Widget"} => "widgets"}
      end)

      assert {:ok, tool} =
               Tool.validate(%ApiDiscovery{user: user}, %{"cluster" => cluster.handle})

      assert {:ok, json} = ApiDiscovery.implement(tool)
      assert Jason.decode!(json) == [
               %{
                 "group" => "example.com",
                 "version" => "v1",
                 "kind" => "Widget",
                 "plural" => "widgets"
               }
             ]
    end

    test "filters discovered APIs by group, version, and kind" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      expect(Clusters, :api_discovery, fn _ ->
        %{
          {"example.com", "v1", "Widget"} => "widgets",
          {"example.com", "v1", "Gadget"} => "gadgets",
          {"example.com", "v2", "Widget"} => "widgets",
          {"unrelated.com", "v1", "Widget"} => "widgets"
        }
      end)

      assert {:ok, tool} =
               Tool.validate(%ApiDiscovery{user: user}, %{
                 "cluster" => cluster.handle,
                 "group" => "EXAMPLE",
                 "version" => "1",
                 "kind" => "idg"
               })

      assert {:ok, json} = ApiDiscovery.implement(tool)

      assert Jason.decode!(json) == [
               %{
                 "group" => "example.com",
                 "version" => "v1",
                 "kind" => "Widget",
                 "plural" => "widgets"
               }
             ]
    end
  end

  describe "ApiSpec" do
    test "requires the cluster, group, version, and query" do
      assert {:error, changeset} = Tool.validate(%ApiSpec{}, %{})

      for field <- [:cluster, :group, :version, :query] do
        assert Keyword.has_key?(changeset.errors, field)
      end
    end

    test "searches the requested cluster's OpenAPI schemas" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      expect(Clusters, :api_spec, fn fetched, "example.com", "v1" ->
        assert fetched.id == cluster.id

        {:ok,
         %{
           "components" => %{
             "schemas" => %{
               "com.example.v1.Widget" => %{"type" => "object"},
               "com.example.v1.Gadget" => %{"type" => "object"}
             }
           }
         }}
      end)

      assert {:ok, tool} =
               Tool.validate(%ApiSpec{user: user}, %{
                 "cluster" => cluster.handle,
                 "group" => "example.com",
                 "version" => "v1",
                 "query" => "widget"
               })

      assert {:ok, json} = ApiSpec.implement(tool)

      assert Jason.decode!(json) == %{
               "com.example.v1.Widget" => %{"type" => "object"}
             }
    end
  end
end
