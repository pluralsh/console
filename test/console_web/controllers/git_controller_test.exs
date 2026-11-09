defmodule ConsoleWeb.GitControllerTest do
  use ConsoleWeb.ConnCase, async: false
  use Mimic
  alias Console.Deployments.Git.Discovery
  alias Console.Deployments.Local.Server
  alias Console.Deployments.Services
  alias Console.Schema.Revision

  describe "agent_chart/2" do
    test "it can download the current valid agent chart", %{conn: conn} do
      conn
      |> get("/ext/v1/agent/chart")
      |> response(200)
    end
  end

  describe "#tarball/2" do
    test "it serves the embedded chart for the current deploy operator", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      svc = insert(:service,
        name: "deploy-operator",
        repository: git,
        git: %{ref: Console.Deployments.Settings.agent_ref(), folder: "charts/deployment-operator"}
      )
      chart = Console.Deployments.Settings.agent_service_chart()
      digest = Console.sha_file(chart)

      conn =
        conn
        |> add_auth_headers(svc.cluster)
        |> get("/v1/git/tarballs", %{id: svc.id})

      body = response(conn, 200)
      assert body == File.read!(chart)
      assert {:ok, files} = :erl_tar.extract({:binary, body}, [:compressed, :memory])
      assert List.keymember?(files, ~c"Chart.yaml", 0)
      assert get_resp_header(conn, "x-plrl-digest") == [digest]
    end

    test "it will download git content for valid deploy tokens", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: svc.id})
      |> response(200)
    end

    test "it will download helm content for valid deploy tokens", %{conn: conn} do
      svc = insert(:service, helm: %{url: "https://pluralsh.github.io/console", chart: "console", version: "0.3.15"})

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: svc.id})
      |> response(200)
    end

    test "it will download multisource content for valid deploy tokens", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service,
        helm: %{
          url: "https://pluralsh.github.io/console",
          chart: "console",
          version: "0.3.15",
          values_files: ["values.yaml.tpl"]
        },
        repository: git,
        git: %{ref: "master", folder: "templates"}
      )

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: svc.id})
      |> response(200)
    end

    test "it will download multisource content from multiple git repos", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service,
        helm: %{
          repository_id: git.id,
          git: %{ref: "master", folder: "charts/console"},
          values_files: ["values.yaml.tpl"]
        },
        repository: git,
        git: %{ref: "master", folder: "templates"}
      )

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: svc.id})
      |> response(200)
    end

    test "if fetching a bogus resource it will 402 and persist an error", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      svc = insert(:service, repository: git, git: %{ref: "doesnt-exist", folder: "bin"})

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: svc.id})
      |> response(402)

      %{errors: [error]} = refetch(svc) |> Console.Repo.preload([:errors])
      assert error.source == "git"
      assert error.message == "could not resolve ref doesnt-exist"
    end

    test "if the agent is bootstrapping it persists a warning", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      %{id: id} = svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      expect(Discovery, :digest, fn _, _ -> {:error, :agent_bootstrapping} end)

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: id})
      |> response(425)

      %{errors: [error]} = svc = refetch(svc) |> Console.Repo.preload([:errors])
      assert svc.status == :stale
      assert error.source == "git"
      assert error.message == "Git or Helm agent is bootstrapping"
      assert error.warning
    end

    test "if the fetch is rate limited it persists a warning", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      %{id: id} = svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      expect(Discovery, :digest, fn _, _ -> {:error, :rate_limited} end)

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: id})
      |> response(429)

      %{errors: [error]} = refetch(svc) |> Console.Repo.preload([:errors])
      assert error.source == "git"
      assert error.message == "Rate limited"
      assert error.warning
    end

    test "if fetching and dependencies are not satisfied, it will 402 and persist an error", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})
      dep = insert(:service_dependency, service: svc)

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: svc.id})
      |> response(402)

      %{errors: [error]} = svc =
        refetch(svc)
        |> Console.Repo.preload([:errors])

      assert svc.status == :stale
      assert error.source == "git"
      assert error.warning
      assert error.message =~ "dependency #{dep.name} is not ready"
    end

    test "non-permitted tokens are 403'ed", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      conn
      |> add_auth_headers(insert(:cluster))
      |> get("/v1/git/tarballs", %{id: svc.id})
      |> response(403)
    end

    test "it records a new commit when the tarball is served from cache", %{conn: conn} do
      svc = cached_git_service("old-sha", :synced)
      new_sha = "new-sha"
      {fingerprint, chart} = prime_tarball_cache(svc)

      expect(Discovery, :commit, fn repo, ref ->
        assert repo.id == svc.repository_id
        assert ref.ref == "master"
        assert ref.folder == "bin"
        {:ok, new_sha, "cached commit"}
      end)

      conn =
        conn
        |> add_auth_headers(svc.cluster)
        |> get("/v1/git/tarballs", %{id: svc.id})

      assert response(conn, 200) == File.read!(chart)
      assert get_resp_header(conn, "x-plrl-digest") == [fingerprint]

      svc = refetch(svc)
      assert svc.sha == new_sha
      assert svc.status == :stale
      assert svc.message == "cached commit"

      revisions = Revision.for_service(svc.id) |> Console.Repo.all()
      assert length(revisions) == 2
      assert Enum.all?(revisions, & &1.sha == new_sha)
    end

    test "it leaves the service alone when the cached commit is unchanged", %{conn: conn} do
      sha = "same-sha"
      svc = cached_git_service(sha, :synced)
      before = refetch(svc)
      count = revision_count(svc.id)
      {fingerprint, chart} = prime_tarball_cache(svc)

      expect(Discovery, :commit, fn _, _ -> {:ok, sha, "ignored"} end)

      conn =
        conn
        |> add_auth_headers(svc.cluster)
        |> get("/v1/git/tarballs", %{id: svc.id})

      assert response(conn, 200) == File.read!(chart)
      assert get_resp_header(conn, "x-plrl-digest") == [fingerprint]

      svc = refetch(svc)
      assert svc.sha == sha
      assert svc.status == :synced
      assert svc.updated_at == before.updated_at
      assert revision_count(svc.id) == count
    end
  end

  describe "#digest/2" do
    test "it returns the embedded chart digest for the current deploy operator", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      svc = insert(:service,
        name: "deploy-operator",
        repository: git,
        git: %{ref: Console.Deployments.Settings.agent_ref(), folder: "charts/deployment-operator"}
      )

      response =
        conn
        |> add_auth_headers(svc.cluster)
        |> get("/ext/v1/digests", %{id: svc.id})
        |> response(200)

      assert response == Console.sha_file(Console.Deployments.Settings.agent_service_chart())
    end

    test "it will return digests for valid deploy tokens", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/ext/v1/digests", %{id: svc.id})
      |> response(200)
    end

    test "if fetching a bogus resource it will 402 and persist an error", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      svc = insert(:service, repository: git, git: %{ref: "doesnt-exist", folder: "bin"})

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/ext/v1/digests", %{id: svc.id})
      |> response(402)

      %{errors: [error]} = refetch(svc) |> Console.Repo.preload([:errors])
      assert error.source == "git"
      assert error.message == "could not resolve ref doesnt-exist"
    end

    test "if the agent is bootstrapping it persists a warning", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      %{id: id} = svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      expect(Discovery, :digest, fn _, _ -> {:error, :agent_bootstrapping} end)

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/ext/v1/digests", %{id: id})
      |> response(425)

      %{errors: [error]} = svc = refetch(svc) |> Console.Repo.preload([:errors])
      assert svc.status == :stale
      assert error.source == "git"
      assert error.message == "Git or Helm agent is bootstrapping"
      assert error.warning
    end

    test "if the fetch is rate limited it persists a warning", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      %{id: id} = svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      expect(Discovery, :digest, fn _, _ -> {:error, :rate_limited} end)

      conn =
        conn
        |> add_auth_headers(svc.cluster)
        |> get("/ext/v1/digests", %{id: id})

      assert response(conn, 429)
      assert get_resp_header(conn, "retry-after") == ["1"]

      %{errors: [error]} = refetch(svc) |> Console.Repo.preload([:errors])
      assert error.source == "git"
      assert error.message == "Rate limited"
      assert error.warning
    end

    test "db pool queue timeouts are 429'ed with a retry-after", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      expect(Discovery, :digest, fn _, _ ->
        raise DBConnection.ConnectionError.exception("connection not available", :queue_timeout)
      end)

      {429, headers, _} = assert_error_sent 429, fn ->
        conn
        |> add_auth_headers(svc.cluster)
        |> get("/ext/v1/digests", %{id: svc.id})
      end

      assert {"retry-after", "1"} in headers
    end

    @tag :skip
    test "if fetching and dependencies are not satisfied, it will 402 and persist an error", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})
      dep = insert(:service_dependency, service: svc)

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/ext/v1/digests", %{id: svc.id})
      |> response(402)

      %{errors: [error]} = refetch(svc) |> Console.Repo.preload([:errors])
      assert error.source == "git"
      assert error.message =~ "dependency #{dep.name} is not ready"
    end

    test "it will digest multisource content from multiple git repos", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service,
        helm: %{
          repository_id: git.id,
          git: %{ref: "master", folder: "charts/console"},
          values_files: ["values.yaml.tpl"]
        },
        repository: git,
        git: %{ref: "master", folder: "templates"}
      )

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/digests", %{id: svc.id})
      |> response(200)
    end

    test "non-permitted tokens are 403'ed", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      conn
      |> add_auth_headers(insert(:cluster))
      |> get("/v1/digests", %{id: svc.id})
      |> response(403)
    end
  end

  describe "tarball rate limiting" do
    test "it globally rate limits digest and tarball endpoints" do
      bucket = "tarball:global"
      previous_qps = Application.get_env(:console, :tarball_qps)

      Hammer.delete_buckets(bucket)
      Application.put_env(:console, :tarball_qps, 1)

      on_exit(fn ->
        Hammer.delete_buckets(bucket)

        if is_nil(previous_qps),
          do: Application.delete_env(:console, :tarball_qps),
          else: Application.put_env(:console, :tarball_qps, previous_qps)
      end)

      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})
      other_cluster = insert(:cluster)

      assert {:allow, 1} = Hammer.check_rate(bucket, :timer.seconds(1), 1)

      conn =
        build_conn()
        |> Map.put(:remote_ip, {127, 0, 0, 42})
        |> add_auth_headers(other_cluster)
        |> get("/v1/git/tarballs", %{id: svc.id})

      assert response(conn, 429) == "Too Many Requests"
      assert get_resp_header(conn, "retry-after") == ["1"]
    end
  end

  describe "#stack_tarball/2" do
    test "it will download stack git content for valid deploy tokens", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      run = insert(:stack_run, repository: git, git: %{ref: "main", folder: "charts/deployment-operator"})

      conn
      |> add_auth_headers(run.cluster)
      |> get("/v1/git/stacks/tarballs", %{id: run.id})
      |> response(200)
    end
  end

  describe "#sentinel_tarball/2" do
    test "it will download sentinel git content for valid deploy tokens", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      run = insert(:sentinel_run_job,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"},
        sentinel_run: insert(:sentinel_run)
      )

      conn
      |> add_auth_headers(run.cluster)
      |> get("/ext/v1/git/sentinels/tarballs", %{id: run.id})
      |> response(200)
    end
  end

  describe "#proceed" do
    test "if a service has been marked it will 200", %{conn: conn} do
      svc = insert(:service, promotion: :proceed)

      conn
      |> get("/ext/v1/gate/#{svc.id}")
      |> response(200)

      conn
      |> get("/ext/v1/gate/#{svc.cluster.handle}/#{svc.name}")
      |> response(200)

      conn
      |> post("/ext/v1/gate/#{svc.id}")
      |> response(200)

      conn
      |> post("/ext/v1/gate/#{svc.cluster.handle}/#{svc.name}")
      |> response(200)
    end

    test "if a service hasn't been marked it will 402", %{conn: conn} do
      svc = insert(:service)

      conn
      |> get("/ext/v1/gate/#{svc.id}")
      |> response(402)

      conn
      |> post("/ext/v1/gate/#{svc.id}")
      |> response(402)
    end
  end

  describe "#rollback" do
    test "if a service has been marked it will 200", %{conn: conn} do
      svc = insert(:service, promotion: :rollback)

      conn
      |> get("/ext/v1/rollback/#{svc.id}")
      |> response(200)

      conn
      |> get("/ext/v1/rollback/#{svc.cluster.handle}/#{svc.name}")
      |> response(200)

      conn
      |> post("/ext/v1/rollback/#{svc.id}")
      |> response(200)

      conn
      |> post("/ext/v1/rollback/#{svc.cluster.handle}/#{svc.name}")
      |> response(200)
    end

    test "if a service hasn't been marked it will 402", %{conn: conn} do
      svc = insert(:service)

      conn
      |> get("/ext/v1/rollback/#{svc.id}")
      |> response(402)

      conn
      |> post("/ext/v1/rollback/#{svc.id}")
      |> response(402)
    end
  end

  defp cached_git_service(sha, status) do
    cluster = insert(:cluster)
    git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")

    {:ok, svc} = Services.create_service(%{
      name: "cache-hit",
      namespace: "test",
      version: "0.0.1",
      repository_id: git.id,
      git: %{ref: "master", folder: "bin"}
    }, cluster.id, admin_user())

    svc = Console.Repo.preload(svc, [:revision])
    {:ok, _} = Ecto.Changeset.change(svc.revision, %{sha: sha}) |> Console.Repo.update()
    {:ok, svc} = Ecto.Changeset.change(svc, %{sha: sha, status: status}) |> Console.Repo.update()
    Console.Repo.preload(svc, [:cluster, :revision], force: true)
  end

  defp prime_tarball_cache(svc) do
    stub(Discovery, :digest, fn _, _ -> {:ok, "discovery-digest"} end)
    {:ok, fingerprint} = Services.digest(svc)
    chart = Console.Deployments.Settings.agent_service_chart()
    {:ok, _} = Server.fetch(fingerprint, fn -> File.open(chart) end)
    {fingerprint, chart}
  end

  defp revision_count(service_id) do
    Revision.for_service(service_id)
    |> Console.Repo.aggregate(:count)
  end
end
