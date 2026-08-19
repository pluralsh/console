defmodule Console.Deployments.PubSub.BindingTest do
  use Console.DataCase, async: true

  alias Console.PubSub
  alias Console.Repo
  alias Console.Schema.{StackPolicy, WorkbenchPolicy}
  alias Console.Deployments.Policy
  alias Console.Deployments.PubSub.{Bindable, Binding}

  describe "Bindable" do
    test "loads workbench and stack targets with their evaluation preloads" do
      project = insert(:project)
      workbench = insert(:workbench, project: project)
      stack = insert(:stack, project: project)
      workbench_id = workbench.id
      stack_id = stack.id
      project_id = project.id

      assert %{id: ^workbench_id, project: %{id: ^project_id}, tools: tools} =
               Bindable.target(%PubSub.WorkbenchCreated{item: workbench})

      assert is_list(tools)

      assert %{id: ^stack_id, project: %{id: ^project_id}} =
               Bindable.target(%PubSub.StackUpdated{item: stack})
    end

    test "ignores events without a bindable target" do
      assert :ok = Bindable.target(%PubSub.ServiceCreated{item: insert(:service)})
    end
  end

  describe "binding reconciliation" do
    test "reconciles matching binding policies when a workbench is created or updated" do
      insert(:user, bot_name: "console")
      project = insert(:project)
      workbench = insert(:workbench, project: project, name: "target")
      other_workbench = insert(:workbench)
      policy = insert(:policy, project: project)
      bind_policy = insert(:policy,
        project: project,
        type: :binding,
        policy: "package plrl.binding\nbind := true"
      )

      insert(:binding_policy,
        policy: policy,
        bind_policy: bind_policy,
        matches: %{workbench: %{regexes: [".*"]}}
      )

      :ok = Binding.handle_event(%PubSub.WorkbenchCreated{item: workbench})
      assert Repo.get_by(WorkbenchPolicy, policy_id: policy.id, workbench_id: workbench.id)

      :ok = Binding.handle_event(%PubSub.WorkbenchCreated{item: other_workbench})
      refute Repo.get_by(WorkbenchPolicy, policy_id: policy.id, workbench_id: other_workbench.id)

      {:ok, _} =
        Policy.update_policy(
          %{policy: "package plrl.binding\nbind := false"},
          bind_policy.id,
          admin_user()
        )

      :ok = Binding.handle_event(%PubSub.WorkbenchUpdated{item: workbench})
      refute Repo.get_by(WorkbenchPolicy, policy_id: policy.id, workbench_id: workbench.id)
    end

    test "reconciles matching binding policies when a stack is created or updated" do
      insert(:user, bot_name: "console")
      project = insert(:project)
      stack = insert(:stack, project: project)
      other_stack = insert(:stack)
      policy = insert(:policy, project: project, type: :stack)
      bind_policy = insert(:policy, project: project, type: :binding, policy: "package plrl.binding\nbind := true")
      insert(:binding_policy, policy: policy, bind_policy: bind_policy, type: :stack)

      :ok = Binding.handle_event(%PubSub.StackCreated{item: stack})
      assert Repo.get_by(StackPolicy, policy_id: policy.id, stack_id: stack.id)

      :ok = Binding.handle_event(%PubSub.StackCreated{item: other_stack})
      refute Repo.get_by(StackPolicy, policy_id: policy.id, stack_id: other_stack.id)

      {:ok, _} = Policy.update_policy(%{policy: "package plrl.binding\nbind := false"}, bind_policy.id, admin_user())

      :ok = Binding.handle_event(%PubSub.StackUpdated{item: stack})
      refute Repo.get_by(StackPolicy, policy_id: policy.id, stack_id: stack.id)
    end

    test "only reconciles policies for the event target type" do
      insert(:user, bot_name: "console")
      project = insert(:project)
      workbench = insert(:workbench, project: project)
      stack = insert(:stack, project: project)
      policy = insert(:policy, project: project, type: :stack)
      bind_policy = insert(:policy, project: project, type: :binding, policy: "package plrl.binding\nbind := true")
      insert(:binding_policy, policy: policy, bind_policy: bind_policy, type: :stack)

      :ok = Binding.handle_event(%PubSub.WorkbenchCreated{item: workbench})

      refute Repo.get_by(WorkbenchPolicy, policy_id: policy.id, workbench_id: workbench.id)
      refute Repo.get_by(StackPolicy, policy_id: policy.id, stack_id: stack.id)
    end

    test "does nothing for events without a bindable target" do
      assert :ok = Binding.handle_event(%PubSub.ServiceCreated{item: insert(:service)})
    end
  end
end
