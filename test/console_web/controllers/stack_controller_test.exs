defmodule ConsoleWeb.StackControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "GET /ext/v1/states/terraform/:id" do
    test "it can fetch a tf state if you have access", %{conn: conn} do
      state = insert(:terraform_state, state: "some state")

      resp =
        conn
        |> basic_auth(state.stack.cluster)
        |> get("/ext/v1/states/terraform/#{state.stack.id}")
        |> response(200)

      assert resp == state.state
    end

    test "it will 204 if there's no state yet", %{conn: conn} do
      stack = insert(:stack)

      conn
      |> basic_auth(stack.cluster)
      |> get("/ext/v1/states/terraform/#{stack.id}")
      |> response(204)
    end

    test "it will 403 if you don't have access", %{conn: conn} do
      state = insert(:terraform_state, state: "some state")

      conn
      |> basic_auth(insert(:cluster))
      |> get("/ext/v1/states/terraform/#{state.stack.id}")
      |> response(403)
    end
  end

  describe "POST /ext/v1/states/terraform/:id" do
    test "it can update a tf state if you have access", %{conn: conn} do
      state = insert(:terraform_state, state: "some state")

      new_state = Jason.encode!(%{new: "state"})
      conn
      |> basic_auth(state.stack.cluster)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/states/terraform/#{state.stack.id}", new_state)
      |> response(200)

      assert refetch(state).state == new_state
    end

    test "it will 403 if you don't have access", %{conn: conn} do
      state = insert(:terraform_state, state: "some state")

      new_state = Jason.encode!(%{new: "state"})

      conn
      |> basic_auth(insert(:cluster))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/states/terraform/#{state.stack.id}", new_state)
      |> response(403)
    end
  end

  describe "POST /ext/v1/states/terraform/:id/lock" do
    test "it can lock a tf state if not locked", %{conn: conn} do
      state = insert(:terraform_state, state: "some state")

      conn
      |> basic_auth(state.stack.cluster)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/states/terraform/#{state.stack.id}/lock", Jason.encode!(%{
        ID: "lock-id",
        Owner: "someone@example.com"
      }))
      |> response(200)
    end

    test "it can upsert and lock a tf state if no state exists", %{conn: conn} do
      stack = insert(:stack)

      conn
      |> basic_auth(stack.cluster)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/states/terraform/#{stack.id}/lock", Jason.encode!(%{
        ID: "lock-id",
        Owner: "someone@example.com"
      }))
      |> response(200)
    end

    test "it will 423 if a different lock exists", %{conn: conn} do
      state = insert(:terraform_state, state: "some state", lock: %{id: "other-id", owner: "someone@example.com"})

      conn
      |> basic_auth(state.stack.cluster)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/states/terraform/#{state.stack.id}/lock", Jason.encode!(%{
        ID: "lock-id",
        Owner: "someone-else@example.com"
      }))
      |> response(423)
    end

    test "it will 403 if you don't have access", %{conn: conn} do
      state = insert(:terraform_state, state: "some state")

      conn
      |> basic_auth(insert(:cluster))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/states/terraform/#{state.stack.id}/lock", Jason.encode!(%{
        ID: "lock-id",
        Owner: "someone@example.com"
      }))
      |> response(403)
    end
  end

  describe "POST /ext/v1/states/terraform/:id/unlock" do
    test "it can unlock a tf state if you have access", %{conn: conn} do
      state = insert(:terraform_state, state: "some state", lock: %{id: "other-id", owner: "someone@example.com"})

      conn
      |> basic_auth(state.stack.cluster)
      |> post("/ext/v1/states/terraform/#{state.stack.id}/unlock")
      |> response(200)

      assert refetch(state).lock == nil
    end

    test "it will 403 if you don't have access", %{conn: conn} do
      state = insert(:terraform_state, state: "some state", lock: %{id: "other-id", owner: "someone@example.com"})

      conn
      |> basic_auth(insert(:cluster))
      |> post("/ext/v1/states/terraform/#{state.stack.id}/unlock")
      |> response(403)
    end
  end

  defp basic_auth(conn, cluster) do
    put_req_header(conn, "authorization", Plug.BasicAuth.encode_basic_auth("token", cluster.deploy_token))
  end
end
