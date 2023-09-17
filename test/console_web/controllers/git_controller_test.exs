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
