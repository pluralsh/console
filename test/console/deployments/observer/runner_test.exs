defmodule Console.Deployments.Observer.RunnerTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Commands.Plural
  alias Console.Deployments.Observer.Runner

  describe "#run/0" do
    test "it can poll a helm repo and add a pipeline context" do
      bot("console")
      pipeline = insert(:pipeline)
      observer = insert(:observer,
        name: "observer",
        target: %{type: :helm, helm: %{url: "https://pluralsh.github.io/console", chart: "console"}},
        actions: [
          %{type: :pipeline, configuration: %{
            pipeline: %{pipeline_id: pipeline.id, context: %{"some" => "$value"}}}
          }
        ],
        crontab: "*/5 * * *"
      )

      {:ok, obs} = Runner.run(observer)

      [context] = Console.Repo.all(Console.Schema.PipelineContext)
      assert context.pipeline_id == pipeline.id
      assert is_binary(context.context["some"])
      assert context.context["some"] != "$value"

      assert obs.id == observer.id
      assert obs.last_value == context.context["some"]
    end

    test "it can poll an oci helm repo and add a pipeline context" do
      bot("console")
      pipeline = insert(:pipeline)
      observer = insert(:observer,
        name: "observer",
        target: %{type: :helm, helm: %{url: "oci://ghcr.io/stefanprodan/charts", chart: "podinfo"}},
        actions: [
          %{type: :pipeline, configuration: %{
            pipeline: %{pipeline_id: pipeline.id, context: %{"some" => "$value"}}}
          }
        ],
        crontab: "*/5 * * *"
      )

      {:ok, obs} = Runner.run(observer)

      [context] = Console.Repo.all(Console.Schema.PipelineContext)
      assert context.pipeline_id == pipeline.id
      assert is_binary(context.context["some"])
      assert context.context["some"] != "$value"

      assert obs.id == observer.id
      assert obs.last_value == context.context["some"]
    end

    test "it can poll an oci repository and add a pipeline context" do
      bot("console")
      pipeline = insert(:pipeline)
      observer = insert(:observer,
        name: "observer",
        target: %{type: :oci, oci: %{url: "oci://ghcr.io/pluralsh/plural"}},
        actions: [
          %{type: :pipeline, configuration: %{
            pipeline: %{pipeline_id: pipeline.id, context: %{"some" => "$value"}}}
          }
        ],
        crontab: "*/5 * * *",
        last_run_at: Timex.now()
      )

      {:ok, obs} = Runner.run(observer)

      refute Timex.equal?(obs.next_run_at, observer.next_run_at)

      assert Console.Helm.Utils.compare_versions(obs.last_value, "0.11.11") != :lt

      [context] = Console.Repo.all(Console.Schema.PipelineContext)
      assert context.pipeline_id == pipeline.id
      assert is_binary(context.context["some"])
      assert context.context["some"] != "$value"

      assert obs.id == observer.id
      assert obs.last_value == context.context["some"]
    end

    test "it can poll an addon and add a pipeline context" do
      bot("console")
      pipeline = insert(:pipeline)
      observer = insert(:observer,
        name: "observer",
        target: %{type: :addon, addon: %{name: "ingress-nginx", kubernetes_version: "1.30"}},
        actions: [
          %{type: :pipeline, configuration: %{
            pipeline: %{pipeline_id: pipeline.id, context: %{"some" => "$value"}}}
          }
        ],
        crontab: "*/5 * * *"
      )

      {:ok, obs} = Runner.run(observer)

      [context] = Console.Repo.all(Console.Schema.PipelineContext)
      assert context.pipeline_id == pipeline.id
      assert is_binary(context.context["some"])
      assert context.context["some"] != "$value"

      assert obs.id == observer.id
      assert obs.last_value == context.context["some"]
    end

    test "it can poll an eks addon and add a pipeline context" do
      bot("console")
      pipeline = insert(:pipeline)
      observer = insert(:observer,
        name: "observer",
        target: %{type: :eks_addon, eks_addon: %{name: "coredns", kubernetes_version: "1.30"}},
        actions: [
          %{type: :pipeline, configuration: %{
            pipeline: %{pipeline_id: pipeline.id, context: %{"some" => "$value"}}}
          }
        ],
        crontab: "*/5 * * *"
      )

      {:ok, obs} = Runner.run(observer)

      [context] = Console.Repo.all(Console.Schema.PipelineContext)
      assert context.pipeline_id == pipeline.id
      assert is_binary(context.context["some"])
      assert context.context["some"] != "$value"

      assert obs.id == observer.id
      assert obs.last_value == context.context["some"]
    end

    test "it can poll a helm repo and execute a pr automation" do
      user = bot("console")
      conn = insert(:scm_connection, token: "some-pat")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}]
      )

      expect(Plural, :template, fn f, _, _ -> File.read(f) end)
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: _, body: "pr message"} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "pluralsh/console", _ -> {:ok, conn} end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, _ -> {:ok, ""} end)

      observer = insert(:observer,
        name: "observer",
        target: %{type: :helm, helm: %{url: "https://pluralsh.github.io/console", chart: "console"}},
        actions: [
          %{type: :pr, configuration: %{
            pr: %{automation_id: pra.id, context: %{"some" => "$value"}}}
          }
        ],
        crontab: "*/5 * * *"
      )

      {:ok, obs} = Runner.run(observer)

      assert obs.id == observer.id
      assert obs.last_value

      [pr] = Console.Repo.all(Console.Schema.PullRequest)

      assert pr.cluster_id == pra.cluster_id
      assert pr.url == "https://github.com/pr/url"
      assert pr.title == pra.title

      assert_receive {:event, %PubSub.PullRequestCreated{}}
    end
  end
end

defmodule Console.Deployments.Observer.AsyncRunnerTest do
  use Console.DataCase, async: false
  alias Console.Deployments.Observer.Runner

  describe "#run/0" do
    test "it can poll a git repo and add a pipeline context" do
      bot("console")
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      pipeline = insert(:pipeline)
      observer = insert(:observer,
        name: "observer",
        target: %{type: :git, git: %{repository_id: git.id}},
        actions: [
          %{type: :pipeline, configuration: %{
            pipeline: %{pipeline_id: pipeline.id, context: %{"some" => "$value"}}}
          }
        ],
        crontab: "*/5 * * *"
      )

      {:ok, obs} = Runner.run(observer)

      assert Console.Helm.Utils.compare_versions(obs.last_value, "v0.10.24") != :lt

      [context] = Console.Repo.all(Console.Schema.PipelineContext)
      assert context.pipeline_id == pipeline.id
      assert is_binary(context.context["some"])
      assert context.context["some"] != "$value"

      assert obs.id == observer.id
      assert obs.last_value == context.context["some"]
    end
  end
end
