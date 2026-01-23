defmodule ConsoleWeb.OpenAPI.AI.SentinelControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#show/2" do
    test "returns the sentinel if user has project access", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sentinels/#{sentinel.id}")
        |> json_response(200)

      assert result["id"] == sentinel.id
      assert result["name"] == sentinel.name
    end

    test "returns the sentinel for admin users", %{conn: conn} do
      sentinel = insert(:sentinel)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/sentinels/#{sentinel.id}")
        |> json_response(200)

      assert result["id"] == sentinel.id
    end

    test "it 403s if user does not have project access", %{conn: conn} do
      user = insert(:user)
      sentinel = insert(:sentinel)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/ai/sentinels/#{sentinel.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of sentinels user has access to", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinels = insert_list(3, :sentinel, project: project)
      insert_list(2, :sentinel)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sentinels")
        |> json_response(200)

      assert ids_equal(results, sentinels)
    end

    test "filters by status", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      pending_sentinel = insert(:sentinel, project: project, status: :pending)
      insert(:sentinel, project: project, status: :success)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sentinels?status=pending")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == pending_sentinel.id
    end

    test "searches by name with q parameter", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      matching = insert(:sentinel, name: "matching-sentinel", project: project)
      insert(:sentinel, name: "other-sentinel", project: project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sentinels?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == matching.id
    end

    test "supports pagination", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      insert_list(5, :sentinel, project: project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sentinels?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end

    test "admin users can see all sentinels", %{conn: conn} do
      sentinels = insert_list(3, :sentinel)

      %{"data" => results} =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/sentinels")
        |> json_response(200)

      assert ids_equal(results, sentinels)
    end
  end

  describe "#trigger/2" do
    test "triggers a sentinel run", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      result =
        conn
        |> add_auth_headers(user)
        |> post("/v1/api/ai/sentinels/#{sentinel.id}/trigger")
        |> json_response(200)

      assert result["id"]
      assert result["status"] == "pending"
      assert result["sentinel_id"] == sentinel.id
    end

    test "admin users can trigger sentinels", %{conn: conn} do
      sentinel = insert(:sentinel)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> post("/v1/api/ai/sentinels/#{sentinel.id}/trigger")
        |> json_response(200)

      assert result["id"]
      assert result["status"] == "pending"
    end

    test "users without write access cannot trigger sentinels", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      conn
      |> add_auth_headers(user)
      |> post("/v1/api/ai/sentinels/#{sentinel.id}/trigger")
      |> json_response(403)
    end
  end
end
