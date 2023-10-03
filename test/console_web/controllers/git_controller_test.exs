defmodule ConsoleWeb.GitControllerTest do
  use ConsoleWeb.ConnCase, async: false

  describe "#tarball/2" do
    test "it will download git content for valid deploy tokens", %{conn: conn} do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

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
      assert error.message == "error: pathspec 'doesnt-exist' did not match any file(s) known to git\n"
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
end
