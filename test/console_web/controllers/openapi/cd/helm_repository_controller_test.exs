defmodule ConsoleWeb.OpenAPI.CD.HelmRepositoryControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the helm repository", %{conn: conn} do
      user = insert(:user)
      repo = insert(:helm_repository)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/helm/repositories/#{repo.id}")
        |> json_response(200)

      assert result["id"] == repo.id
      assert result["url"] == repo.url
    end
  end

  describe "#show_by_url/2" do
    test "returns the helm repository by url", %{conn: conn} do
      user = insert(:user)
      repo = insert(:helm_repository)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/helm/repositories/url", url: repo.url)
        |> json_response(200)

      assert result["id"] == repo.id
      assert result["url"] == repo.url
    end

    test "returns 404 when repository not found", %{conn: conn} do
      user = insert(:user)

      assert_raise Ecto.NoResultsError, fn ->
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/helm/repositories/url", url: "https://charts.nonexistent.com")
        |> json_response(404)
      end
    end
  end

  describe "#index/2" do
    test "returns the list of helm repositories", %{conn: conn} do
      user = insert(:user)
      repos = insert_list(3, :helm_repository)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/helm/repositories")
        |> json_response(200)

      assert ids_equal(results, repos)
    end

    test "can filter by health", %{conn: conn} do
      user = insert(:user)
      pullable = insert_list(2, :helm_repository, health: :pullable)
      insert_list(3, :helm_repository, health: :failed)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/helm/repositories", health: "pullable")
        |> json_response(200)

      assert ids_equal(results, pullable)
    end
  end

  describe "#upsert/2" do
    test "it can create a helm repository", %{conn: conn} do
      url = "https://charts.example.com"

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/v1/api/cd/helm/repositories", %{url: url})
        |> json_response(200)

      assert result["id"]
      assert result["url"] == url
    end

    test "it can update an existing helm repository", %{conn: conn} do
      repo = insert(:helm_repository)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/v1/api/cd/helm/repositories", %{url: repo.url, provider: "bearer", auth: %{bearer: %{token: "test"}}})
        |> json_response(200)

      assert result["id"] == repo.id
      assert result["url"] == repo.url
      assert result["provider"] == "bearer"
    end

    test "users with git bindings can upsert a helm repository", %{conn: conn} do
      user = insert(:user)
      deployment_settings(git_bindings: [%{user_id: user.id}])
      url = "https://charts.example.com"

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/cd/helm/repositories", %{url: url})
        |> json_response(200)

      assert result["id"]
      assert result["url"] == url
    end

    test "non-authorized users cannot upsert a helm repository", %{conn: conn} do
      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/v1/api/cd/helm/repositories", %{url: "https://charts.example.com"})
      |> json_response(403)
    end
  end
end
