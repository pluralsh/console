defmodule Console.Deployments.StacksTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.Stacks
  alias Console.Deployments.Git.Discovery

  describe "#create_stack/2" do
    test "admins can create a stack" do
      cluster = insert(:cluster)
      repo = insert(:git_repository)

      {:ok, stack} = Stacks.create_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        repository_id: repo.id,
        cluster_id: cluster.id,
        git: %{ref: "main", folder: "terraform"},
      }, admin_user())

      assert stack.name == "my-stack"
      assert stack.type == :terraform
      assert stack.approval
      assert stack.repository_id == repo.id
      assert stack.cluster_id == cluster.id
      assert stack.git.ref == "main"
      assert stack.git.folder == "terraform"

      assert_receive {:event, %PubSub.StackCreated{item: ^stack}}
    end

    test "cluster writers can create a stack" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      repo = insert(:git_repository)

      {:ok, stack} = Stacks.create_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        repository_id: repo.id,
        cluster_id: cluster.id,
        git: %{ref: "main", folder: "terraform"},
      }, user)

      assert stack.name == "my-stack"
      assert stack.type == :terraform
      assert stack.approval
      assert stack.repository_id == repo.id
      assert stack.cluster_id == cluster.id
      assert stack.git.ref == "main"
      assert stack.git.folder == "terraform"
    end

    test "random users cannot create" do
      cluster = insert(:cluster)
      repo = insert(:git_repository)

      {:error, _} = Stacks.create_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        repository_id: repo.id,
        cluster_id: cluster.id,
        git: %{ref: "main", folder: "terraform"},
      }, insert(:user))
    end
  end

  describe "#update_stack/3" do
    test "stack writers can update" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])

      {:ok, stack} = Stacks.update_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        git: %{ref: "main", folder: "terraform"},
      }, stack.id, user)

      assert stack.name == "my-stack"
      assert stack.type == :terraform
      assert stack.approval
      assert stack.git.ref == "main"
      assert stack.git.folder == "terraform"

      assert_receive {:event, %PubSub.StackUpdated{item: ^stack}}
    end

    test "random users cannot update" do
      stack = insert(:stack)

      {:error, _} = Stacks.update_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        git: %{ref: "main", folder: "terraform"},
      }, stack.id, insert(:user))
    end
  end

  describe "#delete_stack/2" do
    test "stack writers can delete" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])

      {:ok, deleted} = Stacks.delete_stack(stack.id, user)

      assert deleted.id == stack.id
      assert deleted.deleted_at

      assert_receive {:event, %PubSub.StackDeleted{item: ^deleted}}
    end

    test "random users cannot delete" do
      stack = insert(:stack)

      {:error, _} = Stacks.delete_stack(stack.id, insert(:user))
    end
  end

  describe "#detach_stack/2" do
    test "stack writers can delete" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])

      {:ok, deleted} = Stacks.detach_stack(stack.id, user)

      assert deleted.id == stack.id
      refute refetch(stack)

      assert_receive {:event, %PubSub.StackDetached{item: ^deleted}}
    end

    test "random users cannot delete" do
      stack = insert(:stack)

      {:error, _} = Stacks.detach_stack(stack.id, insert(:user))
    end
  end

  describe "#poll/1" do
    test "it can create a new run when the sha changes" do
      stack = insert(:stack)
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)

      {:ok, run} = Stacks.poll(stack)

      assert run.stack_id == stack.id
      assert run.status == :queued
      assert run.cluster_id == stack.cluster_id
      assert run.repository_id == stack.repository_id
      assert run.git.ref == "new-sha"
      assert run.git.folder == stack.git.folder
      [first, second, third] = run.steps

      assert first.cmd == "terraform"
      assert first.args == ["init", "-upgrade"]
      assert first.index == 0

      assert second.cmd == "terraform"
      assert second.args == ["plan"]
      assert second.index == 1

      assert third.cmd == "terraform"
      assert third.args == ["apply", "-auto-approve"]
      assert third.index == 2

      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}
    end

    test "it will ignore if the shas are the same" do
      stack = insert(:stack, sha: "old-sha")
      expect(Discovery, :sha, fn _, _ -> {:ok, "old-sha"} end)

      {:error, _} = Stacks.poll(stack)
    end
  end

  describe "#dequeue/1" do
    test "tries to dequeue the next wet run of the stack" do
      stack = insert(:stack)
      insert(:stack_run, stack: stack, status: :successful)
      :timer.sleep(1)
      run = insert(:stack_run, stack: stack, status: :queued)

      {:ok, dequeued} = Stacks.dequeue(stack)

      assert dequeued.id == run.id
      assert dequeued.status == :pending

      assert_receive {:event, %PubSub.StackRunUpdated{item: ^dequeued}}
    end

    test "it will fail if the stack is currently running" do
      stack = insert(:stack)
      insert(:stack_run, stack: stack, status: :pending)
      :timer.sleep(1)
      insert(:stack_run, stack: stack, status: :queued)

      {:error, _} = Stacks.dequeue(stack)
    end

    test "it will fail if there are no runs to dequeue" do
      stack = insert(:stack)
      insert(:stack_run, stack: stack, status: :successful)
      insert(:stack_run, stack: stack, status: :pending)

      {:error, _} = Stacks.dequeue(stack)
    end
  end

  describe "#update_stack_run/3" do
    test "writers can update runs" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)

      {:ok, updated} = Stacks.update_stack_run(%{status: :successful}, run.id, user)

      assert updated.id == run.id
      assert updated.status == :successful

      assert refetch(stack).status == :successful

      assert_receive {:event, %PubSub.StackRunUpdated{item: ^updated}}
    end

    test "clusters can update runs" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)

      {:ok, updated} = Stacks.update_stack_run(%{status: :successful}, run.id, run.cluster)

      assert updated.id == run.id
      assert updated.status == :successful

      assert refetch(stack).status == :successful

      assert_receive {:event, %PubSub.StackRunUpdated{item: ^updated}}
    end

    test "random users cannot update runs" do
      stack = insert(:stack)
      run = insert(:stack_run, stack: stack)

      {:error, _} = Stacks.update_stack_run(%{status: :successful}, run.id, insert(:user))
    end

    test "random clusters cannot update runs" do
      stack = insert(:stack)
      run = insert(:stack_run, stack: stack)

      {:error, _} = Stacks.update_stack_run(%{status: :successful}, run.id, insert(:cluster))
    end
  end

  describe "#approve_stack_run/3" do
    test "writers can approve runs" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)

      {:ok, approved} = Stacks.approve_stack_run(run.id, user)

      assert approved.id == run.id
      assert approved.approved_at
      assert approved.approver_id == user.id

      assert_receive {:event, %PubSub.StackRunUpdated{item: ^approved}}
    end

    test "random users cannot approve runs" do
      user = insert(:user)
      stack = insert(:stack)
      run = insert(:stack_run, stack: stack)

      {:error, _} = Stacks.approve_stack_run(run.id, user)
    end
  end

  describe "#complete_stack_run/3" do
    test "writers can compelete runs" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)

      {:ok, completed} = Stacks.complete_stack_run(%{
        status: :successful,
        output: [%{name: "some-output", value: "val"}]
      }, run.id, user)

      assert completed.id == run.id
      assert completed.status == :successful
      [output] = completed.output
      assert output.name == "some-output"
      assert output.value == "val"

      %{output: [output]} = stack = refetch(stack) |> Repo.preload([:output], force: true)
      assert stack.status == :successful
      assert stack.last_successful == completed.git.ref
      assert output.name == "some-output"
      assert output.value == "val"

      assert_receive {:event, %PubSub.StackRunCompleted{item: ^completed}}
    end

    test "clusters can complete runs" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)

      {:ok, completed} = Stacks.complete_stack_run(%{status: :successful}, run.id, run.cluster)

      assert completed.id == run.id
      assert completed.status == :successful

      assert_receive {:event, %PubSub.StackRunCompleted{item: ^completed}}
    end

    test "random users cannot complete runs" do
      stack = insert(:stack)
      run = insert(:stack_run, stack: stack)

      {:error, _} = Stacks.complete_stack_run(%{status: :successful}, run.id, insert(:user))
    end

    test "random clusters cannot complete runs" do
      stack = insert(:stack)
      run = insert(:stack_run, stack: stack)

      {:error, _} = Stacks.complete_stack_run(%{status: :successful}, run.id, insert(:cluster))
    end
  end

  describe "#update_run_step/3" do
    test "cluster can update a run step" do
      step = insert(:run_step)

      {:ok, updated} = Stacks.update_run_step(%{status: :running}, step.id, step.run.cluster)

      assert updated.id == step.id
      assert updated.status == :running
    end

    test "random clusters cannot update steps" do
      step = insert(:run_step)

      {:error, _} = Stacks.update_run_step(%{status: :running}, step.id, insert(:cluster))
    end
  end

  describe "#add_run_logs/3" do
    test "cluster can add run logs" do
      step = insert(:run_step)

      {:ok, log} = Stacks.add_run_logs(%{logs: "some logs"}, step.id, step.run.cluster)

      assert log.step_id == step.id
      assert log.logs == "some logs"
    end

    test "random clusters cannot add logs" do
      step = insert(:run_step)

      {:error, _} = Stacks.add_run_logs(%{content: "some logs"}, step.id, insert(:cluster))
    end
  end
end
