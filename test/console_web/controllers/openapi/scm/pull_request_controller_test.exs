defmodule ConsoleWeb.OpenAPI.SCM.PullRequestControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the pull request", %{conn: conn} do
      user = admin_user()
      pr = insert(:pull_request)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/scm/pullrequests/#{pr.id}")
        |> json_response(200)

      assert result["id"] == pr.id
      assert result["title"] == pr.title
      assert result["url"] == pr.url
    end
  end

  describe "#index/2" do
    test "returns the list of pull requests", %{conn: conn} do
      user = admin_user()
      prs = insert_list(3, :pull_request)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/scm/pullrequests")
        |> json_response(200)

      assert ids_equal(results, prs)
    end

    test "filters by cluster_id", %{conn: conn} do
      user = admin_user()
      cluster = insert(:cluster)
      prs1 = insert_list(2, :pull_request, cluster: cluster)
      insert_list(2, :pull_request)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/scm/pullrequests?cluster_id=#{cluster.id}")
        |> json_response(200)

      assert ids_equal(results, prs1)
    end

    test "filters by service_id", %{conn: conn} do
      user = admin_user()
      service = insert(:service)
      prs1 = insert_list(2, :pull_request, service: service)
      insert_list(2, :pull_request)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/scm/pullrequests?service_id=#{service.id}")
        |> json_response(200)

      assert ids_equal(results, prs1)
    end

    test "filters by stack_id", %{conn: conn} do
      user = admin_user()
      stack = insert(:stack)
      prs1 = insert_list(2, :pull_request, stack: stack)
      insert_list(2, :pull_request)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/scm/pullrequests?stack_id=#{stack.id}")
        |> json_response(200)

      assert ids_equal(results, prs1)
    end

    test "filters by open status", %{conn: conn} do
      user = admin_user()
      open_prs = insert_list(2, :pull_request, status: :open)
      insert_list(2, :pull_request, status: :merged)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/scm/pullrequests?open=true")
        |> json_response(200)

      assert ids_equal(results, open_prs)
    end

    test "searches by title with q parameter", %{conn: conn} do
      user = admin_user()
      pr1 = insert(:pull_request, title: "matching-title")
      insert(:pull_request, title: "other-title")

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/scm/pullrequests?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == pr1.id
    end

    test "supports pagination", %{conn: conn} do
      user = admin_user()
      insert_list(5, :pull_request)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/scm/pullrequests?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end
end
