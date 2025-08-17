defmodule ConsoleWeb.GitControllerTest do
  use ConsoleWeb.ConnCase, async: false

  describe "agent_chart/2" do
    test "it can download the current valid agent chart", %{conn: conn} do
      conn
      |> get("/ext/v1/agent/chart")
      |> response(200)
    end
  end

  describe "#tarball/2" do
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

    test "if fetching and dependencies are not satisfied, it will 402 and persist an error", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})
      dep = insert(:service_dependency, service: svc)

      conn
      |> add_auth_headers(svc.cluster)
      |> get("/v1/git/tarballs", %{id: svc.id})
      |> response(402)

      %{errors: [error]} = refetch(svc) |> Console.Repo.preload([:errors])
      assert error.source == "git"
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
  end

  describe "#digest/2" do
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
end
