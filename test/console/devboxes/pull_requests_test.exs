defmodule Console.Devboxes.PullRequestsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Devboxes.{Control, ProxyModels, PullRequests}
  alias Console.Devboxes.PullRequests.Job

  @prepared %{
    remote_url: "git@github.com:pluralsh/console.git",
    checkout_path: "/home/dev/console",
    head_branch: "devbox/add-health",
    base_branch: "main",
    title: "Add a health check",
    body: "Adds health().",
    head_sha: "head-sha",
    base_sha: "base-sha",
    additions: 3,
    deletions: 0,
    committed: true,
    writer: "ai_proxy"
  }

  describe "#create/3" do
    test "someone with access starts a job for a checkout of a live instance" do
      inst = readable_instance()
      expect(PullRequests, :spawn_job, fn fun when is_function(fun, 0) -> {:ok, self()} end)

      {:ok, %Job{status: :running, repository: "console"} = job} = PullRequests.create(inst.id, %{repository: "console"}, inst.user)

      assert job.instance_id == inst.id
      assert_receive {:event, %PubSub.DevboxPullRequestJobUpdated{item: %Job{status: :running}}}
    end

    test "others can't, and the instance must be live" do
      inst = insert(:devbox_instance)
      {:error, _} = PullRequests.create(inst.id, %{repository: "console"}, insert(:user))

      ended = readable_instance(status: :completed)
      {:error, _} = PullRequests.create(ended.id, %{repository: "console"}, ended.user)
    end

    test "a thread must belong to the instance" do
      inst = readable_instance()
      other = insert(:devbox_instance_session)
      {:error, _} = PullRequests.create(inst.id, %{repository: "console", thread_id: other.id}, inst.user)
    end
  end

  describe "#run/3" do
    test "the box prepares the branch with the proxy's tool model, then console opens the pr" do
      insert(:scm_connection, default: true)
      inst = insert(:devbox_instance)
      thread = insert(:devbox_instance_session, instance: inst)
      expect(ProxyModels, :writer_model, fn -> "anthropic/claude-sonnet-5-5" end)
      expect(Control.Test, :prepare_pull_request, fn %{id: id}, %{repository: "console", model: "anthropic/claude-sonnet-5-5", thread_id: tid} ->
        assert id == inst.id
        assert tid == thread.id
        {:ok, @prepared}
      end)
      expect(Console.Deployments.Pr.Dispatcher, :pr, fn conn, "Add a health check", "Adds health().", "https://github.com/pluralsh/console.git", "main", "devbox/add-health", _ ->
        assert conn.commit_shas == %{"devbox/add-health" => "head-sha", "main" => "base-sha"}
        {:ok, %{url: "https://github.com/pluralsh/console/pull/7", title: "Add a health check"}}
      end)

      job = %Job{id: "j", instance_id: inst.id, repository: "console", status: :running}
      {:ok, %Job{status: :succeeded, url: "https://github.com/pluralsh/console/pull/7", writer: "ai_proxy"}} = PullRequests.run(job, inst, thread)

      [pr] = Console.Repo.all(Console.Schema.PullRequest)
      assert pr.source == :devbox
      assert pr.devbox_instance_id == inst.id
      assert pr.devbox_instance_session_id == thread.id
      assert_receive {:event, %PubSub.DevboxPullRequestJobUpdated{item: %Job{status: :succeeded}}}
    end

    test "failures from the box end the job with the reason" do
      inst = insert(:devbox_instance)
      expect(ProxyModels, :writer_model, fn -> nil end)
      expect(Control.Test, :prepare_pull_request, fn _, _ -> {:error, "console has no changes to open a pull request for"} end)

      job = %Job{id: "j", instance_id: inst.id, repository: "console", status: :running}
      {:ok, %Job{status: :failed, error: "console has no changes" <> _}} = PullRequests.run(job, inst, nil)
    end
  end

  describe "#writer/2" do
    test "console ai wins, else a subscription agent's cli, else the template" do
      inst = insert(:devbox_instance, agent: :claude, agent_billing: %{"codex" => "subscription"})
      thread = insert(:devbox_instance_session, instance: inst, agent: :codex)

      expect(ProxyModels, :writer_model, fn -> "openai/gpt-5.6-terra" end)
      assert PullRequests.writer(inst, thread) == %{model: "openai/gpt-5.6-terra"}

      stub(ProxyModels, :writer_model, fn -> nil end)
      assert PullRequests.writer(inst, thread) == %{agent: :codex}
      assert PullRequests.writer(inst, nil) == %{agent: :codex}

      proxied = insert(:devbox_instance, agent_billing: %{"claude" => "proxy"})
      assert PullRequests.writer(proxied, nil) == %{agent: nil}
    end
  end

  defp readable_instance(attrs \\ []) do
    user = insert(:user)
    wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
    insert(:devbox_instance, Keyword.merge(attrs, user: user, workbench: wb))
    |> Console.Repo.preload([:user])
  end
end
