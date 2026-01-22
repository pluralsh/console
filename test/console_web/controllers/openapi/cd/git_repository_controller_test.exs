defmodule ConsoleWeb.OpenAPI.CD.GitRepositoryControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the git repository", %{conn: conn} do
      user = insert(:user)
      repo = insert(:git_repository)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/git/repositories/#{repo.id}")
        |> json_response(200)

      assert result["id"] == repo.id
      assert result["url"] == repo.url
    end
  end

  describe "#index/2" do
    test "returns the list of git repositories", %{conn: conn} do
      user = insert(:user)
      repos = insert_list(3, :git_repository)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/git/repositories")
        |> json_response(200)

      assert ids_equal(results, repos)
    end
  end

  describe "#create/2" do
    test "it can create a git repository", %{conn: conn} do
      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/api/v1/cd/git/repositories", %{url: "https://github.com/pluralsh/test.git"})
        |> json_response(200)

      assert result["id"]
      assert result["url"] == "https://github.com/pluralsh/test.git"
    end

    test "users with git bindings can create a git repository", %{conn: conn} do
      user = insert(:user)
      deployment_settings(git_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/api/v1/cd/git/repositories", %{url: "https://github.com/pluralsh/test.git"})
        |> json_response(200)

      assert result["id"]
      assert result["url"] == "https://github.com/pluralsh/test.git"
    end

    test "non-authorized users cannot create a git repository", %{conn: conn} do
      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/api/v1/cd/git/repositories", %{url: "https://github.com/pluralsh/test.git"})
      |> json_response(403)
    end
  end

  describe "#update/2" do
    test "it can update a git repository", %{conn: conn} do
      repo = insert(:git_repository)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_put("/api/v1/cd/git/repositories/#{repo.id}", %{url: "https://github.com/pluralsh/updated.git"})
        |> json_response(200)

      assert result["id"] == repo.id
      assert result["url"] == "https://github.com/pluralsh/updated.git"
    end

    test "users with git bindings can update a git repository", %{conn: conn} do
      user = insert(:user)
      deployment_settings(git_bindings: [%{user_id: user.id}])
      repo = insert(:git_repository)

      result =
        conn
        |> add_auth_headers(user)
        |> json_put("/api/v1/cd/git/repositories/#{repo.id}", %{url: "https://github.com/pluralsh/updated.git"})
        |> json_response(200)

      assert result["id"] == repo.id
      assert result["url"] == "https://github.com/pluralsh/updated.git"
    end

    test "non-authorized users cannot update a git repository", %{conn: conn} do
      repo = insert(:git_repository)

      conn
      |> add_auth_headers(insert(:user))
      |> json_put("/api/v1/cd/git/repositories/#{repo.id}", %{url: "https://github.com/pluralsh/updated.git"})
      |> json_response(403)
    end
  end

  describe "#delete/2" do
    test "it can delete a git repository", %{conn: conn} do
      repo = insert(:git_repository)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> delete("/api/v1/cd/git/repositories/#{repo.id}")
        |> json_response(200)

      assert result["id"] == repo.id
      refute refetch(repo)
    end

    test "users with git bindings can delete a git repository", %{conn: conn} do
      user = insert(:user)
      deployment_settings(git_bindings: [%{user_id: user.id}])
      repo = insert(:git_repository)

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/api/v1/cd/git/repositories/#{repo.id}")
        |> json_response(200)

      assert result["id"] == repo.id
      refute refetch(repo)
    end

    test "non-authorized users cannot delete a git repository", %{conn: conn} do
      repo = insert(:git_repository)

      conn
      |> add_auth_headers(insert(:user))
      |> delete("/api/v1/cd/git/repositories/#{repo.id}")
      |> json_response(403)
    end
  end
end
