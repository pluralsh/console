defmodule ConsoleWeb.OpenAPI.AI.SentinelRunControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#show/2" do
    test "returns the sentinel run with jobs if user has project access", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)
      run = insert(:sentinel_run, sentinel: sentinel)
      job = insert(:sentinel_run_job, sentinel_run: run)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/ai/sentinelruns/#{run.id}")
        |> json_response(200)

      assert result["id"] == run.id
      assert result["sentinel_id"] == sentinel.id
      assert length(result["jobs"]) == 1
      assert hd(result["jobs"])["id"] == job.id
    end

    test "returns the sentinel run for admin users", %{conn: conn} do
      sentinel = insert(:sentinel)
      run = insert(:sentinel_run, sentinel: sentinel)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> get("/api/v1/ai/sentinelruns/#{run.id}")
        |> json_response(200)

      assert result["id"] == run.id
    end

    test "it 403s if user does not have project access", %{conn: conn} do
      user = insert(:user)
      sentinel = insert(:sentinel)
      run = insert(:sentinel_run, sentinel: sentinel)

      conn
      |> add_auth_headers(user)
      |> get("/api/v1/ai/sentinelruns/#{run.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of runs for a sentinel", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)
      runs = insert_list(3, :sentinel_run, sentinel: sentinel)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/ai/sentinels/#{sentinel.id}/runs")
        |> json_response(200)

      assert ids_equal(results, runs)
    end

    test "supports pagination", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)
      insert_list(5, :sentinel_run, sentinel: sentinel)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/ai/sentinels/#{sentinel.id}/runs?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end

    test "admin users can see runs", %{conn: conn} do
      sentinel = insert(:sentinel)
      runs = insert_list(3, :sentinel_run, sentinel: sentinel)

      %{"data" => results} =
        conn
        |> add_auth_headers(admin_user())
        |> get("/api/v1/ai/sentinels/#{sentinel.id}/runs")
        |> json_response(200)

      assert ids_equal(results, runs)
    end

    test "it 403s if user does not have project access", %{conn: conn} do
      user = insert(:user)
      sentinel = insert(:sentinel)
      insert_list(2, :sentinel_run, sentinel: sentinel)

      conn
      |> add_auth_headers(user)
      |> get("/api/v1/ai/sentinels/#{sentinel.id}/runs")
      |> json_response(403)
    end
  end
end
