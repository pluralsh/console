defmodule Console.Deployments.StacksTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Schema.{StackRun}
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
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"}
      )
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Discovery, :changes, fn _, _, _, _ -> {:ok, ["terraform/main.tf"], "a commit message"} end)

      {:ok, run} = Stacks.poll(stack)

      assert run.stack_id == stack.id
      assert run.status == :queued
      assert run.message == "a commit message"
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
      assert third.args == ["apply", "terraform.tfplan"]
      assert third.index == 2

      stack = refetch(stack)
      assert stack.sha == "new-sha"
      %{environment: [_], files: [_]} = Console.Repo.preload(stack, [:environment, :files])

      [_] = StackRun.for_stack(stack.id) |> Console.Repo.all()
      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}
    end

    test "it can create a new run with hooks interleaved" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"},
        configuration: %{
          version: "1.5.0",
          hooks: [
            %{cmd: "echo", args: ["hello world"], after_stage: :plan}
          ]
        }
      )
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Discovery, :changes, fn _, _, _, _ -> {:ok, ["terraform/main.tf"], "a commit message"} end)

      {:ok, run} = Stacks.poll(stack)

      assert run.stack_id == stack.id
      assert run.status == :queued
      assert run.message == "a commit message"
      assert run.cluster_id == stack.cluster_id
      assert run.repository_id == stack.repository_id
      assert run.git.ref == "new-sha"
      assert run.git.folder == stack.git.folder
      [first, second, third, fourth] = run.steps

      assert first.cmd == "terraform"
      assert first.args == ["init", "-upgrade"]
      assert first.index == 0

      assert second.cmd == "terraform"
      assert second.args == ["plan"]
      assert second.index == 1

      assert third.cmd == "echo"
      assert third.args == ["hello world"]
      assert third.index == 2

      assert fourth.cmd == "terraform"
      assert fourth.args == ["apply", "terraform.tfplan"]
      assert fourth.index == 3

      stack = refetch(stack)
      assert stack.sha == "new-sha"
      %{environment: [_], files: [_]} = Console.Repo.preload(stack, [:environment, :files])

      [_] = StackRun.for_stack(stack.id) |> Console.Repo.all()
      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}
    end

    test "it can create a new run from a pr if the sha changes" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"},
        sha: "old-sha"
      )
      pr = insert(:pull_request, stack: stack)
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Discovery, :changes, fn _, _, _, _ -> {:ok, ["terraform/main.tf"], "a commit message"} end)

      {:ok, run} = Stacks.poll(pr)

      assert run.stack_id == stack.id
      assert run.pull_request_id == pr.id
      assert run.status == :queued
      assert run.dry_run
      assert run.message == "a commit message"
      assert run.cluster_id == stack.cluster_id
      assert run.repository_id == stack.repository_id
      assert run.git.ref == "new-sha"
      assert run.git.folder == stack.git.folder
      [first, second] = run.steps

      assert first.cmd == "terraform"
      assert first.args == ["init", "-upgrade"]
      assert first.index == 0

      assert second.cmd == "terraform"
      assert second.args == ["plan"]
      assert second.index == 1

      stack = refetch(stack)
      assert stack.sha == "old-sha"
      %{environment: [_], files: [_]} = Console.Repo.preload(stack, [:environment, :files])

      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}

      assert refetch(pr).ref == "new-sha"
    end

    test "it will ignore if the shas are the same" do
      stack = insert(:stack, sha: "old-sha")
      expect(Discovery, :sha, fn _, _ -> {:ok, "old-sha"} end)

      {:error, _} = Stacks.poll(stack)
    end
  end

  describe "#post_comment/1" do
    test "it can post a comment to a pr" do
      run = insert(:stack_run,
        state: build(:stack_state),
        pull_request: build(:pull_request, url: "https://github.com/pluralsh/console/pull/10"),
        stack: build(:stack, connection: build(:scm_connection))
      )

      expect(Tentacat.Pulls.Reviews, :create, fn _, _, _, _, _ -> {:ok, %{"id" => "id"}, :ok} end)

      {:ok, "id"} = Stacks.post_comment(run)
    end
  end

  describe "#restart_run/2" do
    test "it can recreate the run for a stack if still on the sha" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"},
        sha: "some-sha"
      )
      run = insert(:stack_run, git: %{ref: "some-sha"}, stack: stack)

      {:ok, new_run} = Stacks.restart_run(run.id, admin_user())

      assert new_run.stack_id == stack.id
      assert new_run.git.ref == "some-sha"
    end

    test "it cannot restart if on the wrong sha" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"},
        sha: "some-sha"
      )
      run = insert(:stack_run, git: %{ref: "wrong-sha"}, stack: stack)

      {:error, _} = Stacks.restart_run(run.id, admin_user())
    end

    test "non-writers cannot restart" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"},
        sha: "some-sha"
      )
      run = insert(:stack_run, git: %{ref: "some-sha"}, stack: stack)

      {:error, _} = Stacks.restart_run(run.id, insert(:user))
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

    test "tries to dequeue the next dry pr run of the stack for a pr" do
      stack = insert(:stack)
      pr = insert(:pull_request, stack: stack)
      insert(:stack_run, stack: stack, status: :successful, pull_request: pr, dry_run: true)
      :timer.sleep(1)
      run = insert(:stack_run, stack: stack, status: :queued, pull_request: pr, dry_run: true)

      {:ok, dequeued} = Stacks.dequeue(pr)

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

    test "it will fail if the stack is currently running a pr run" do
      stack = insert(:stack)
      pr = insert(:pull_request, stack: stack)
      insert(:stack_run, stack: stack, status: :pending, pull_request: pr, dry_run: true)
      :timer.sleep(1)
      insert(:stack_run, stack: stack, status: :queued, pull_request: pr, dry_run: true)

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

      {:ok, updated} = Stacks.update_stack_run(%{
        status: :successful,
        job_ref: %{namespace: "ns", name: "name"}
      }, run.id, user)

      assert updated.id == run.id
      assert updated.status == :successful
      assert updated.job_ref.namespace == "ns"
      assert updated.job_ref.name == "name"

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
        state: %{plan: "some plan"},
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

      # can still complete when completed
      {:ok, _} = Stacks.complete_stack_run(%{
        status: :successful,
        state: %{plan: "some plan"},
        output: [%{name: "some-output", value: "val"}]
      }, run.id, user)
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

  describe "#create_custom_run/3" do
    test "stack writers can create custom runs" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], sha: "test-sha")

      {:ok, run} = Stacks.create_custom_run(stack.id, [%{cmd: "echo", args: ["hello world!"]}], user)

      assert run.stack_id == stack.id
      refute run.dry_run
      assert run.git.ref == "test-sha"
      assert run.git.folder == stack.git.folder

      [step] = run.steps

      assert step.cmd == "echo"
      assert step.args == ["hello world!"]
    end

    test "non admins cannot create custom runs" do
      user = insert(:user)
      stack = insert(:stack)

      {:error, _} = Stacks.create_custom_run(stack.id, [%{cmd: "echo", args: ["hello world!"]}], user)
    end
  end

  describe "#upsert_custom_stack_run/2" do
    test "admins can add custom stack run records" do
      stack = insert(:stack)
      {:ok, csr} = Stacks.upsert_custom_stack_run(%{
        name: "test",
        stack_id: stack.id,
        commands: [%{cmd: "echo", args: ["hello world"]}]
      }, admin_user())

      assert csr.name == "test"
      assert csr.stack_id == stack.id
      [cmd] = csr.commands

      assert cmd.cmd == "echo"
      assert cmd.args == ["hello world"]
    end

    test "nonadmins cannot create" do
      stack = insert(:stack)
      {:error, _} = Stacks.upsert_custom_stack_run(%{
        name: "test",
        stack_id: stack.id,
        commands: [%{cmd: "echo", args: ["hello world"]}]
      }, insert(:user))
    end
  end

  describe "#delete_custom_stack_run/2" do
    test "admins can add custom stack run records" do
      csr = insert(:custom_stack_run)
      {:ok, csr} = Stacks.delete_custom_stack_run(csr.id, admin_user())

      refute refetch(csr)
    end

    test "nonadmins cannot create" do
      csr = insert(:custom_stack_run)
      {:error, _} = Stacks.delete_custom_stack_run(csr.id, insert(:user))
    end
  end
end

defmodule Console.Deployments.StacksSyncTest do
  use Console.DataCase, async: false
  alias Console.Deployments.Stacks

  describe "#poll/1" do
    test "it will create runs when it detects changes" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      stack = insert(:stack,
        repository: git,
        git: %{ref: "master", folder: "charts"},
        sha: "e136726eb7f3ef1d3578b8b250b1fc1957331a84"
      )

      {:ok, run} = Stacks.poll(stack)

      assert run.status == :queued
      refute run.dry_run
      assert run.message
      assert run.stack_id == stack.id
      refute run.git.ref == stack.git.ref
    end
  end
end
