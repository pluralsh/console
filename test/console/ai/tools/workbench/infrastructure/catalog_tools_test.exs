defmodule Console.AI.Tools.Workbench.Infrastructure.CatalogToolsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Infrastructure.{
    Cluster,
    ClusterList,
    ClusterTags,
    ClusterServices,
    Projects,
    ServiceInspect,
    StackInspect,
    StackList
  }

  describe "ClusterList (plrl_clusters)" do
    test "returns {:ok, json} including clusters the user can read" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%ClusterList{user: user}, %{})
      assert {:ok, json} = ClusterList.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert is_list(list)
      assert Enum.any?(list, &(&1["id"] == cluster.id))
    end

    test "returns {:ok, empty list} when the user has no cluster access" do
      user = insert(:user)
      insert(:cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterList{user: user}, %{})
      assert {:ok, json} = ClusterList.implement(parsed)
      assert {:ok, []} = Jason.decode(json)
    end

    test "filters results by project name" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      other_project = insert(:project, read_bindings: [%{user_id: user.id}])
      allowed_cluster = insert(:cluster, project: project, read_bindings: [%{user_id: user.id}])
      _other_cluster = insert(:cluster, project: other_project, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%ClusterList{user: user}, %{"project" => project.name})
      assert {:ok, json} = ClusterList.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == allowed_cluster.id))
      refute Enum.any?(list, &(&1["project"]["name"] == other_project.name))
    end
  end

  describe "ClusterTags (plrl_cluster_tags)" do
    test "returns {:ok, json} listing cluster tags" do
      cluster = insert(:cluster)
      tag = insert(:tag, cluster: cluster, name: "team", value: "platform")

      assert {:ok, parsed} = Tool.validate(%ClusterTags{}, %{})
      assert {:ok, json} = ClusterTags.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["name"] == tag.name and &1["value"] == tag.value))
    end

    test "filters tags by tag name" do
      cluster = insert(:cluster)
      _tag1 = insert(:tag, cluster: cluster, name: "team", value: "platform")
      tag2 = insert(:tag, cluster: cluster, name: "env", value: "prod")

      assert {:ok, parsed} = Tool.validate(%ClusterTags{}, %{"tag" => "env"})
      assert {:ok, json} = ClusterTags.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.all?(list, &(&1["name"] == "env"))
      assert Enum.any?(list, &(&1["name"] == tag2.name and &1["value"] == tag2.value))
    end
  end

  describe "Projects (plrl_projects)" do
    test "returns {:ok, json} including projects the user can read" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%Projects{user: user}, %{})
      assert {:ok, json} = Projects.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == project.id))
    end

    test "filters projects by q search" do
      user = insert(:user)
      project = insert(:project, name: "alpha-observability", read_bindings: [%{user_id: user.id}])
      _other = insert(:project, name: "beta-platform", read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%Projects{user: user}, %{"q" => "alpha"})
      assert {:ok, json} = Projects.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == project.id))
      assert Enum.all?(list, &(String.contains?(&1["name"], "alpha")))
    end
  end

  describe "Cluster (plrl_cluster)" do
    test "returns {:ok, _} when the user can read the cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%Cluster{user: user}, %{"handle" => cluster.handle})
      assert {:ok, content} = Cluster.implement(parsed)
      assert is_binary(content)
    end

    test "returns {:error, _} when the user cannot read the cluster" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])

      assert {:ok, parsed} = Tool.validate(%Cluster{user: other}, %{"handle" => cluster.handle})
      assert {:error, _} = Cluster.implement(parsed)
    end
  end

  describe "ClusterServices (plrl_cluster_services)" do
    test "returns {:ok, json} listing services when the user can read the cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterServices{user: user}, %{"cluster" => cluster.handle})
      assert {:ok, json} = ClusterServices.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == service.id))
    end

    test "returns {:error, _} when the user cannot read the cluster" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])
      insert(:service, cluster: cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterServices{user: other}, %{"cluster" => cluster.handle})
      assert {:error, _} = ClusterServices.implement(parsed)
    end
  end

  describe "ServiceInspect (plrl_service)" do
    test "returns {:ok, _} when the user can read the service" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} =
               Tool.validate(%ServiceInspect{user: user}, %{"service_id" => service.id})

      assert {:ok, content} = ServiceInspect.implement(parsed)
      assert is_binary(content)
    end

    test "returns {:error, _} when the user cannot read the service" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} =
               Tool.validate(%ServiceInspect{user: other}, %{"service_id" => service.id})

      assert {:error, _} = ServiceInspect.implement(parsed)
    end
  end

  describe "StackList (plrl_stacks)" do
    test "returns {:ok, json} including stacks the user can read" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%StackList{user: user}, %{})
      assert {:ok, json} = StackList.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == stack.id))
    end

    test "returns {:ok, empty list} when the user has no stack access" do
      user = insert(:user)
      insert(:stack)

      assert {:ok, parsed} = Tool.validate(%StackList{user: user}, %{})
      assert {:ok, json} = StackList.implement(parsed)
      assert {:ok, []} = Jason.decode(json)
    end
  end

  describe "StackInspect (plrl_stack)" do
    test "returns {:ok, _} when the user can read the stack" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%StackInspect{user: user}, %{"stack_id" => stack.id})
      assert {:ok, content} = StackInspect.implement(parsed)
      assert is_binary(content)
    end

    test "returns {:error, _} when the user cannot read the stack" do
      owner = insert(:user)
      other = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: owner.id}])

      assert {:ok, parsed} = Tool.validate(%StackInspect{user: other}, %{"stack_id" => stack.id})
      assert {:error, _} = StackInspect.implement(parsed)
    end

    test "when status is failed, includes latest failed run and failing step logs" do
      user = insert(:user)
      stack = insert(:stack, status: :failed, read_bindings: [%{user_id: user.id}])

      run =
        insert(:stack_run,
          stack: stack,
          cluster: stack.cluster,
          repository: stack.repository,
          status: :failed,
          message: "apply failed",
          git: stack.git
        )

      step =
        insert(:run_step,
          run: run,
          status: :failed,
          stage: :apply,
          cmd: "terraform",
          args: ["apply"],
          index: 1
        )

      insert(:run_log, step: step, logs: "Error: something broke")

      assert {:ok, parsed} = Tool.validate(%StackInspect{user: user}, %{"stack_id" => stack.id})
      assert {:ok, content} = StackInspect.implement(parsed)

      assert content =~ "Latest failed run"
      assert content =~ run.id
      assert content =~ "terraform"
      assert content =~ "Error: something broke"
    end
  end
end
