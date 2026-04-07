defmodule Console.AI.Tools.Workbench.Infrastructure.CatalogToolsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Infrastructure.{
    Cluster,
    ClusterList,
    ClusterServices,
    ServiceInspect,
    StackInspect,
    StackList
  }

  describe "ClusterList (plrl_clusters)" do
    test "returns {:ok, json} including clusters the user can read" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%ClusterList{user: user}, %{})
      assert {:ok, json} = ClusterList.implement(nil, parsed)
      assert {:ok, list} = Jason.decode(json)
      assert is_list(list)
      assert Enum.any?(list, &(&1["id"] == cluster.id))
    end

    test "returns {:ok, empty list} when the user has no cluster access" do
      user = insert(:user)
      insert(:cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterList{user: user}, %{})
      assert {:ok, json} = ClusterList.implement(nil, parsed)
      assert {:ok, []} = Jason.decode(json)
    end
  end

  describe "Cluster (plrl_cluster)" do
    test "returns {:ok, _} when the user can read the cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%Cluster{user: user}, %{"handle" => cluster.handle})
      assert {:ok, content} = Cluster.implement(nil, parsed)
      assert is_binary(content)
    end

    test "returns {:error, _} when the user cannot read the cluster" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])

      assert {:ok, parsed} = Tool.validate(%Cluster{user: other}, %{"handle" => cluster.handle})
      assert {:error, _} = Cluster.implement(nil, parsed)
    end
  end

  describe "ClusterServices (plrl_cluster_services)" do
    test "returns {:ok, json} listing services when the user can read the cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterServices{user: user}, %{"cluster" => cluster.handle})
      assert {:ok, json} = ClusterServices.implement(nil, parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == service.id))
    end

    test "returns {:error, _} when the user cannot read the cluster" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])
      insert(:service, cluster: cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterServices{user: other}, %{"cluster" => cluster.handle})
      assert {:error, _} = ClusterServices.implement(nil, parsed)
    end
  end

  describe "ServiceInspect (plrl_service)" do
    test "returns {:ok, _} when the user can read the service" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} =
               Tool.validate(%ServiceInspect{user: user}, %{"service_id" => service.id})

      assert {:ok, content} = ServiceInspect.implement(nil, parsed)
      assert is_binary(content)
    end

    test "returns {:error, _} when the user cannot read the service" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} =
               Tool.validate(%ServiceInspect{user: other}, %{"service_id" => service.id})

      assert {:error, _} = ServiceInspect.implement(nil, parsed)
    end
  end

  describe "StackList (plrl_stacks)" do
    test "returns {:ok, json} including stacks the user can read" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%StackList{user: user}, %{})
      assert {:ok, json} = StackList.implement(nil, parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == stack.id))
    end

    test "returns {:ok, empty list} when the user has no stack access" do
      user = insert(:user)
      insert(:stack)

      assert {:ok, parsed} = Tool.validate(%StackList{user: user}, %{})
      assert {:ok, json} = StackList.implement(nil, parsed)
      assert {:ok, []} = Jason.decode(json)
    end
  end

  describe "StackInspect (plrl_stack)" do
    test "returns {:ok, _} when the user can read the stack" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%StackInspect{user: user}, %{"stack_id" => stack.id})
      assert {:ok, content} = StackInspect.implement(nil, parsed)
      assert is_binary(content)
    end

    test "returns {:error, _} when the user cannot read the stack" do
      owner = insert(:user)
      other = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: owner.id}])

      assert {:ok, parsed} = Tool.validate(%StackInspect{user: other}, %{"stack_id" => stack.id})
      assert {:error, _} = StackInspect.implement(nil, parsed)
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
      assert {:ok, content} = StackInspect.implement(nil, parsed)

      assert content =~ "Latest failed run"
      assert content =~ run.id
      assert content =~ "terraform"
      assert content =~ "Error: something broke"
    end
  end
end
