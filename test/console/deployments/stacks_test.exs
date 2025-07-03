defmodule Console.Deployments.StacksTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Schema.{StackRun}
  alias Console.Deployments.{Stacks, Settings}
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
        project_id: nil,
        git: %{ref: "main", folder: "terraform"},
      }, admin_user())

      assert stack.name == "my-stack"
      assert stack.type == :terraform
      assert stack.approval
      assert stack.repository_id == repo.id
      assert stack.cluster_id == cluster.id
      assert stack.git.ref == "main"
      assert stack.git.folder == "terraform"
      assert stack.project_id == Settings.default_project!().id

      assert_receive {:event, %PubSub.StackCreated{item: ^stack}}
    end

    test "admins can create a stack with an associated cron" do
      cluster = insert(:cluster)
      repo = insert(:git_repository)

      {:ok, stack} = Stacks.create_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        repository_id: repo.id,
        cluster_id: cluster.id,
        cron: %{crontab: "*/5 * * * *"},
        project_id: nil,
        git: %{ref: "main", folder: "terraform"},
      }, admin_user())

      assert stack.name == "my-stack"
      assert stack.type == :terraform
      assert stack.approval
      assert stack.repository_id == repo.id
      assert stack.cluster_id == cluster.id
      assert stack.git.ref == "main"
      assert stack.git.folder == "terraform"
      assert stack.project_id == Settings.default_project!().id

      assert stack.cron.crontab == "*/5 * * * *"
      assert stack.cron.next_run_at
      assert stack.cron.stack_id == stack.id

      assert_receive {:event, %PubSub.StackCreated{item: ^stack}}
    end

    test "project writers can create a stack" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      cluster = insert(:cluster, project: project)
      repo = insert(:git_repository)

      {:ok, stack} = Stacks.create_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        repository_id: repo.id,
        project_id: project.id,
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

    test "non-cluster writers cannot create a stack" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      cluster = insert(:cluster)
      repo = insert(:git_repository)

      {:error, _} = Stacks.create_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        repository_id: repo.id,
        project_id: project.id,
        cluster_id: cluster.id,
        git: %{ref: "main", folder: "terraform"},
      }, user)
    end

    test "random users cannot create" do
      cluster = insert(:cluster)
      repo = insert(:git_repository)
      user = insert(:user)

      {:error, _} = Stacks.create_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        repository_id: repo.id,
        cluster_id: cluster.id,
        write_bindings: [%{user_id: user.id}],
        git: %{ref: "main", folder: "terraform"},
      }, user)
    end
  end

  describe "#update_stack/3" do
    test "stack writers can update" do
      user = insert(:user)
      repo = insert(:git_repository)
      cluster = insert(:cluster)

      {:ok, stack} = Stacks.create_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        repository_id: repo.id,
        cluster_id: cluster.id,
        environment: [%{name: "first", value: "value"}, %{name: "second", value: "value2"}],
        files: [%{path: "some-file", content: "blah"}, %{path: "other-file", content: "blahblah"}],
        git: %{ref: "main", folder: "terraform"},
        write_bindings: [%{user_id: user.id}]
      }, admin_user())

      {:ok, updated} = Stacks.update_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        environment: [%{name: "first", value: "value"}, %{name: "second", value: "value2"}],
        files: [%{path: "some-file", content: "blah"}, %{path: "other-file", content: "blahblah"}],
        git: %{ref: "main", folder: "terraform"},
      }, stack.id, user)

      assert updated.name == "my-stack"
      assert updated.type == :terraform
      assert updated.approval
      assert updated.git.ref == "main"
      assert updated.git.folder == "terraform"
      refute updated.runnable

      assert_receive {:event, %PubSub.StackUpdated{item: ^updated}}
    end

    test "if it makes a meaningful change, a run will be auto-created" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Discovery, :changes, fn _, _, _, _ -> {:ok, ["new-folder/main.tf"], "a commit message"} end)

      {:ok, stack} = Stacks.update_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        git: %{ref: "main", folder: "new-folder"},
      }, stack.id, user)

      assert stack.name == "my-stack"
      assert stack.type == :terraform
      assert stack.approval
      assert stack.git.ref == "main"
      assert stack.git.folder == "new-folder"

      [_] = StackRun.for_stack(stack.id) |> Console.Repo.all()

      assert_receive {:event, %PubSub.StackUpdated{item: ^stack}}
    end

    test "you can update bindings" do
      user = admin_user()
      stack = insert(:stack)

      {:ok, stack} = Stacks.update_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        git: %{ref: "main", folder: "terraform"},
        write_bindings: [%{user_id: user.id}]
      }, stack.id, user)

      assert stack.name == "my-stack"
      assert stack.type == :terraform
      assert stack.approval
      assert stack.git.ref == "main"
      assert stack.git.folder == "terraform"

      assert Enum.find(stack.write_bindings, & &1.user_id == user.id)

      assert_receive {:event, %PubSub.StackUpdated{item: ^stack}}
    end

    test "you cannot update agent id" do
      stack = insert(:stack, agent_id: "agent-id")

      {:error, _} = Stacks.update_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        git: %{ref: "main", folder: "terraform"},
        agent_id: "other-agent-id"
      }, stack.id, admin_user())
    end

    test "random users cannot update" do
      stack = insert(:stack)
      user = insert(:user)

      {:error, _} = Stacks.update_stack(%{
        name: "my-stack",
        type: :terraform,
        approval: true,
        write_bindings: [%{user_id: user.id}],
        git: %{ref: "main", folder: "terraform"}
      }, stack.id, user)
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

  describe "#restore_stack" do
    test "it can remove deletion state and cancel the destroy run" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], deleted_at: Timex.now())
      run = insert(:stack_run, stack: stack, status: :pending_approval)
      {:ok, stack} = Console.Schema.Stack.delete_changeset(stack, %{delete_run_id: run.id})
                     |> Console.Repo.update()

      {:ok, deleted} = Stacks.restore_stack(stack.id, user)

      assert deleted.id == stack.id
      assert deleted.deleted_at == nil
      assert deleted.delete_run_id == nil

      assert refetch(run).status == :cancelled
    end

    test "non-writers cannot restore" do
      stack = insert(:stack, deleted_at: Timex.now())

      {:error, _} = Stacks.restore_stack(stack.id, insert(:user))
    end
  end

  describe "#spawn/1" do
    test "it can create a run in response to a stack cron" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"},
        sha: "old-sha"
      )
      cron = insert(:stack_cron, stack: stack)

      {:ok, run} = Stacks.spawn_cron(cron)

      assert run.stack_id == stack.id
      assert run.message

      assert run.cluster_id == stack.cluster_id
      assert run.repository_id == stack.repository_id
      assert run.git.ref == "old-sha"
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

      cron = refetch(cron)
      assert cron.last_run_at
      assert Timex.after?(cron.next_run_at, cron.last_run_at)
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
      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}, :timer.seconds(10)
    end

    test "it will not create a new run if there are no file changes" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"}
      )
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Discovery, :changes, fn _, _, _, _ -> {:error, "no changes"} end)

      {:error, _} = Stacks.poll(stack)

      assert refetch(stack).polled_sha == "new-sha"
    end

    test "it can create a new run with hooks interleaved" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"},
        actor: build(:user),
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
      assert run.actor_id == stack.actor_id
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
      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}, :timer.seconds(10)
    end

    test "it can create a new run with a stack definition" do
      definition = insert(:stack_definition, steps: [
        %{cmd: "echo", args: ["hello world"], stage: :plan},
        %{cmd: "sleep", args: ["100"], stage: :apply}
      ])
      stack = insert(:stack,
        definition: definition,
        type: :custom,
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
      [first, second] = run.steps

      assert first.cmd == "echo"
      assert first.args == ["hello world"]
      assert first.index == 0
      assert first.stage == :plan

      assert second.cmd == "sleep"
      assert second.args == ["100"]
      assert second.index == 1
      assert second.stage == :apply

      stack = refetch(stack)
      assert stack.sha == "new-sha"
      %{environment: [_], files: [_]} = Console.Repo.preload(stack, [:environment, :files])

      [_] = StackRun.for_stack(stack.id) |> Console.Repo.all()
      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}, :timer.seconds(10)
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

      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}, :timer.seconds(10)

      %{pull_request: sideload} = Console.Repo.preload(run, [:pull_request])
      assert sideload.id == pr.id

      assert refetch(pr).sha == "new-sha"
    end

    test "it can create a new run an ansible stack" do
      stack = insert(:stack,
        type: :ansible,
        environment: [%{name: "ENV", value: "1"}],
        files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "ansible"},
        sha: "old-sha"
      )
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Discovery, :changes, fn _, _, _, _ -> {:ok, ["ansible/main.yaml"], "a commit message"} end)

      {:ok, run} = Stacks.poll(stack)

      assert run.stack_id == stack.id
      assert run.status == :queued
      assert run.message == "a commit message"
      assert run.cluster_id == stack.cluster_id
      assert run.repository_id == stack.repository_id
      assert run.git.ref == "new-sha"
      assert run.git.folder == stack.git.folder
      [first, second] = run.steps

      assert first.cmd == "ansible-playbook"
      assert first.args == ["main.yaml", "--diff", "--check"]
      assert first.stage == :plan
      assert first.index == 0

      assert second.cmd == "ansible-playbook"
      assert second.args == ["main.yaml"]
      assert second.stage == :apply
      assert second.index == 1

      stack = refetch(stack)
      assert stack.sha == "new-sha"
      %{environment: [_], files: [_]} = Console.Repo.preload(stack, [:environment, :files])

      assert_receive {:event, %PubSub.StackRunCreated{item: ^run}}, :timer.seconds(10)
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
        status: :pending_approval,
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

  describe "#trigger_run/2" do
    test "admins can trigger a new run for a stack" do
      stack = insert(:stack,  git: %{ref: "main", folder: "terraform"})
      run = insert(:stack_run, stack: stack, git: %{ref: "some-sha"})

      {:ok, new_run} = Stacks.trigger_run(stack.id, admin_user())

      assert new_run.git.ref == run.git.ref
    end

    test "non-admins cannot trigger" do
      stack = insert(:stack)
      insert(:stack_run, stack: stack, git: %{ref: "some-sha"})

      {:error, _} = Stacks.trigger_run(stack.id, insert(:user))
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

  describe "#create_custom_stack_run/2" do
    test "admins can add custom stack run records" do
      stack = insert(:stack)
      {:ok, csr} = Stacks.create_custom_stack_run(%{
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

    test "it can upsert non-stack-linked custom stack run records" do
      {:ok, csr} = Stacks.create_custom_stack_run(%{
        name: "test",
        commands: [%{cmd: "echo", args: ["hello world"]}]
      }, admin_user())

      assert csr.name == "test"
      refute csr.stack_id
      [cmd] = csr.commands

      assert cmd.cmd == "echo"
      assert cmd.args == ["hello world"]

      {:ok, updated} = Stacks.update_custom_stack_run(%{
        name: "test",
        commands: [%{cmd: "echo", args: ["hello world"]}]
      }, csr.id, admin_user())

      assert updated.id == csr.id
    end

    test "nonadmins cannot create" do
      stack = insert(:stack)
      {:error, _} = Stacks.create_custom_stack_run(%{
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

  describe "#create_stack_definition/2" do
    test "admins can create a stack definition" do
      {:ok, def} = Stacks.create_stack_definition(%{
        name: "custom",
        steps: [
          %{cmd: "some", args: ["arg"], stage: :apply}
        ],
        configuration: %{image: "some/image", tag: "0.1.0"}
      }, admin_user())

      assert def.name == "custom"
      assert hd(def.steps).cmd == "some"
      assert hd(def.steps).args == ["arg"]
      assert hd(def.steps).stage == :apply

      assert def.configuration.image == "some/image"
      assert def.configuration.tag == "0.1.0"
    end

    test "non-admins cannot create" do
      {:error, _} = Stacks.create_stack_definition(%{
        name: "custom",
        steps: [
          %{cmd: "some", args: ["arg"], stage: :apply}
        ],
        configuration: %{image: "some/image", tag: "0.1.0"}
      }, insert(:user))
    end
  end

  describe "#update_stack_definition/3" do
    test "admins can update a stack definition" do
      def = insert(:stack_definition)

      {:ok, updated} = Stacks.update_stack_definition(%{description: "something"}, def.id, admin_user())

      assert updated.id == def.id
      assert updated.description == "something"
    end

    test "non-admins cannot update a stack definition" do
      def = insert(:stack_definition)

      {:error, _} = Stacks.update_stack_definition(%{description: "something"}, def.id, insert(:user))
    end
  end

  describe "#delete_stack_definition/2" do
    test "admins can delete a stack definition" do
      def = insert(:stack_definition)

      {:ok, deleted} = Stacks.delete_stack_definition(def.id, admin_user())

      assert deleted.id == def.id
      refute refetch(deleted)
    end

    test "non-admins cannot delete a stack definition" do
      def = insert(:stack_definition)

      {:error, _} = Stacks.delete_stack_definition(def.id, insert(:user))
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

  describe "#plural_creds/1" do
    test "a stack with an actor can create run-bound creds" do
      user = insert(:user)
      run  = insert(:stack_run, actor: user)

      {:ok, %{token: token}} = Stacks.plural_creds(run)

      {:ok, actor, _} = Console.Guardian.resource_from_token(token)

      assert actor.id == user.id
    end

    test "tokens cannot validate if the stack run has completed" do
      user = insert(:user)
      run  = insert(:stack_run, actor: user, status: :successful)

      {:ok, %{token: token}} = Stacks.plural_creds(run)

      {:error, _} = Console.Guardian.resource_from_token(token)
    end
  end
end
