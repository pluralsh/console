defmodule ConsoleWeb.WorkbenchFilesControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic
  alias Console.Devboxes.Credentials
  alias Console.PseudoFS
  alias Pseudofs.V1.StatResponse

  @content "hello"

  setup do
    stub(PseudoFS, :enabled?, fn -> true end)
    :ok
  end

  describe "console users" do
    test "readers can list, read, and download a file", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      other = insert(:workbench)
      wid = workbench.id

      expect(PseudoFS, :iterdir, fn ^wid, "/reports" ->
        {:ok, [%{path: "/reports/a.md", name: "a.md", kind: :file}]}
      end)
      expect(PseudoFS, :stat, 2, fn ^wid, "/reports/a.md" ->
        {:ok, %StatResponse{kind: :FILE, size: byte_size(@content)}}
      end)
      expect(PseudoFS, :read_text, fn ^wid, "/reports/a.md" -> {:ok, @content} end)
      expect(PseudoFS, :stream_file, fn ^wid, "/reports/a.md", 0, 5 -> {:ok, [@content]} end)

      conn = add_auth_headers(conn, user)

      listed =
        conn
        |> get("/ext/v1/workbenches/#{workbench.id}/files", %{"path" => "/workbench/reports"})
        |> json_response(200)

      assert listed["files"] == [%{"path" => "/workbench/reports/a.md", "name" => "a.md", "kind" => "file", "size" => nil, "modified_at" => nil}]

      body =
        conn
        |> get("/ext/v1/workbenches/#{workbench.id}/files/content", %{"path" => "/workbench/reports/a.md"})
        |> json_response(200)

      assert body["content"] == @content

      downloaded =
        conn
        |> get("/ext/v1/workbenches/#{workbench.id}/files/download", %{"path" => "/reports/a.md"})

      assert response(downloaded, 200) == @content

      forbidden =
        conn
        |> get("/ext/v1/workbenches/#{other.id}/files", %{"path" => "/"})

      assert response(forbidden, 403) =~ "forbidden"
    end

    test "readers cannot write", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])

      conn
      |> add_auth_headers(user)
      |> json_put("/ext/v1/workbenches/#{workbench.id}/files", %{path: "/notes/a.md", content: "hello"})
      |> response(403)
    end
  end

  describe "devbox tokens" do
    test "a workbench_files token can read its own workbench and write when the owner can", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      inst = insert(:devbox_instance, user: user, workbench: workbench)
      {:ok, token, _} = Credentials.console_token(inst)
      wid = workbench.id

      expect(PseudoFS, :iterdir, fn ^wid, "/" -> {:ok, []} end)
      expect(PseudoFS, :write_file, fn ^wid, "/notes/a.md", ["hello"] -> {:ok, 5} end)
      expect(PseudoFS, :stat, fn ^wid, "/notes/a.md" -> {:ok, %StatResponse{kind: :FILE, size: 5}} end)

      conn = put_req_header(conn, "authorization", "Bearer #{token}")

      listed =
        conn
        |> get("/ext/v1/workbenches/#{workbench.id}/files")
        |> json_response(200)

      assert listed["files"] == []

      written =
        conn
        |> json_put("/ext/v1/workbenches/#{workbench.id}/files", %{path: "/workbench/notes/a.md", content: "hello"})
        |> json_response(200)

      assert written["file"]["path"] == "/workbench/notes/a.md"

      other = insert(:workbench, write_bindings: [%{user_id: user.id}])
      denied = get(conn, "/ext/v1/workbenches/#{other.id}/files")
      assert response(denied, 403) =~ "own workbench"
    end

    test "a read-only binding cannot write", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      inst = insert(:devbox_instance, user: user, workbench: workbench)
      {:ok, token, _} = Credentials.console_token(inst)

      conn
      |> put_req_header("authorization", "Bearer #{token}")
      |> json_put("/ext/v1/workbenches/#{workbench.id}/files", %{path: "/notes/a.md", content: "hello"})
      |> response(403)
    end

    test "workbench_mcp alone cannot call the file routes", %{conn: conn} do
      inst = insert(:devbox_instance, user: admin())
      {:ok, token, _} = Credentials.mint_ai_proxy_token(inst)

      conn
      |> put_req_header("authorization", "Bearer #{token}")
      |> get("/ext/v1/workbenches/#{inst.workbench_id}/files")
      |> response(401)
    end

    test "the token is not a console login", %{conn: conn} do
      inst = insert(:devbox_instance, user: admin())
      {:ok, token, _} = Credentials.console_token(inst)

      conn
      |> put_req_header("authorization", "Bearer #{token}")
      |> put_req_header("content-type", "application/json")
      |> post("/gql", Jason.encode!(%{query: "query { me { id } }"}))
      |> json_response(200)
      |> case do
        %{"data" => %{"me" => nil}, "errors" => [%{"message" => "unauthenticated"}]} -> :ok
        resp -> flunk("devbox token authenticated /gql: #{inspect(resp)}")
      end

      build_conn()
      |> put_req_header("authorization", "Bearer #{token}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/gql", Jason.encode!(%{query: "query { me { id } }"}))
      |> json_response(200)
      |> case do
        %{"data" => %{"me" => nil}, "errors" => [%{"message" => "unauthenticated"}]} -> :ok
        resp -> flunk("devbox token authenticated /ext/gql: #{inspect(resp)}")
      end
    end
  end

  defp admin(), do: insert(:user, roles: %{admin: true})
end
