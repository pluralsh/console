defmodule Console.AI.Tools.Workbench.DescribeComponentTest do
  use Console.DataCase, async: true
  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.DescribeComponent

  describe "implement/1" do
    test "returns a pruned component with simplified children and service details" do
      user = insert(:user, roles: %{admin: true})
      component = insert(:service_component)

      insert(:service_component_child,
        component: component,
        uid: Ecto.UUID.generate(),
        kind: "Deployment",
        name: "api"
      )

      Tool.context(user: user)

      assert {:ok, json} =
               DescribeComponent.implement(%DescribeComponent{component_id: component.id})

      assert %{
               "component_id" => component_id,
               "service_id" => service_id,
               "children" => [
                 %{
                   "group" => "networking.k8s.io",
                   "version" => "v1",
                   "kind" => "Deployment",
                   "namespace" => "name",
                   "name" => "api"
                 }
               ],
               "service" => %{
                 "name" => service_name,
                 "cluster" => %{"name" => cluster_name, "handle" => cluster_handle},
                 "git" => %{"url" => repository_url, "ref" => "main", "folder" => "k8s"}
               }
             } = result = Jason.decode!(json)

      assert component_id == component.id
      assert service_id == component.service_id
      assert service_name == component.service.name
      assert cluster_name == component.service.cluster.name
      assert cluster_handle == component.service.cluster.handle
      assert repository_url == component.service.repository.url

      refute Map.has_key?(result, "id")
      refute Map.has_key?(result, "inserted_at")
      refute Map.has_key?(result, "updated_at")
    end
  end
end
