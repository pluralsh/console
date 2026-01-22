defmodule ConsoleWeb.OpenAPI.StackControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the stack if you can read", %{conn: conn} do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])

      result =
        conn

        |> add_auth_headers(user)
        |> get("/api/v1/stacks/#{stack.id}")
        |> json_response(200)

      assert result["id"] == stack.id
      assert result["name"] == stack.name
      assert result["type"] == to_string(stack.type)
      assert result["status"] == to_string(stack.status)
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      stack = insert(:stack)

      conn
      |> add_auth_headers(user)
      |> get("/api/v1/stacks/#{stack.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of stacks", %{conn: conn} do
      user = insert(:user)
      stacks = insert_list(3, :stack, read_bindings: [%{user_id: user.id}])
      insert_list(3, :stack)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/stacks")
        |> json_response(200)

      assert ids_equal(results, stacks)
    end
  end

  describe "#create/2" do
    test "it can create a stack", %{conn: conn} do
      repo = insert(:git_repository)
      cluster = insert(:cluster)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/api/v1/stacks", %{
          name: "test-stack",
          type: "terraform",
          repository_id: repo.id,
          cluster_id: cluster.id,
          git: %{ref: "main", folder: "terraform"}
        })
        |> json_response(200)

      assert result["id"]
      assert result["name"] == "test-stack"
      assert result["type"] == "terraform"
    end

    test "non-writers cannot create a stack", %{conn: conn} do
      repo = insert(:git_repository)
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/api/v1/stacks", %{
        name: "test-stack",
        type: "terraform",
        repository_id: repo.id,
        cluster_id: cluster.id,
        git: %{ref: "main", folder: "terraform"}
      })
      |> json_response(403)
    end
  end

  describe "#update/2" do
    test "it can update a stack", %{conn: conn} do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_put("/api/v1/stacks/#{stack.id}", %{name: "new-name"})
        |> json_response(200)

      assert result["id"] == stack.id
      assert result["name"] == "new-name"
    end

    test "non-writers cannot update a stack", %{conn: conn} do
      user = insert(:user)
      stack = insert(:stack)

      conn
      |> add_auth_headers(user)
      |> json_put("/api/v1/stacks/#{stack.id}", %{name: "new-name"})
      |> json_response(403)
    end
  end

  describe "#delete/2" do
    test "it can delete a stack", %{conn: conn} do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/api/v1/stacks/#{stack.id}")
        |> json_response(200)

      assert result["id"] == stack.id
      assert refetch(stack).deleted_at
    end

    test "it can detach a stack", %{conn: conn} do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/api/v1/stacks/#{stack.id}?detach=true")
        |> json_response(200)

      assert result["id"] == stack.id
      refute refetch(stack)
    end

    test "non-writers cannot delete a stack", %{conn: conn} do
      user = insert(:user)
      stack = insert(:stack)

      conn
      |> add_auth_headers(user)
      |> delete("/api/v1/stacks/#{stack.id}")
      |> json_response(403)
    end
  end
end
