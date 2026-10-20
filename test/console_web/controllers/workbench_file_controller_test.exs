defmodule ConsoleWeb.WorkbenchFileControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic
  alias Console.PseudoFS
  alias Console.Deployments.WorkbenchFiles
  alias Pseudofs.V1.StatResponse

  @content "0123456789"

  setup do
    stub(PseudoFS, :enabled?, fn -> true end)
    stub(PseudoFS, :stat, fn _, "/videos/clip.mp4" -> {:ok, %StatResponse{kind: :FILE, size: byte_size(@content)}} end)
    stub(PseudoFS, :stream_file, fn _, "/videos/clip.mp4", offset, length ->
      {:ok, [binary_part(@content, offset, length)]}
    end)
    :ok
  end

  describe "#download/2" do
    test "readers can download whole files", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])

      conn =
        conn
        |> add_auth_headers(user)
        |> get("/v1/workbenches/files/download", %{"id" => workbench.id, "path" => "/videos/clip.mp4"})

      assert response(conn, 200) == @content
      assert get_resp_header(conn, "accept-ranges") == ["bytes"]
      assert get_resp_header(conn, "content-length") == ["10"]
      assert [ct] = get_resp_header(conn, "content-type")
      assert ct =~ "video/mp4"
      assert [disposition] = get_resp_header(conn, "content-disposition")
      assert disposition =~ "inline"
    end

    test "scriptable types are always served as attachments", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      stub(PseudoFS, :stat, fn _, _ -> {:ok, %StatResponse{kind: :FILE, size: byte_size(@content)}} end)
      stub(PseudoFS, :stream_file, fn _, _, offset, length -> {:ok, [binary_part(@content, offset, length)]} end)

      for path <- ["/reports/page.html", "/images/logo.svg"] do
        conn =
          conn
          |> recycle()
          |> add_auth_headers(user)
          |> get("/v1/workbenches/files/download", %{"id" => workbench.id, "path" => path})

        assert response(conn, 200) == @content
        assert get_resp_header(conn, "x-content-type-options") == ["nosniff"]
        assert [disposition] = get_resp_header(conn, "content-disposition")
        assert disposition =~ "attachment"
      end
    end

    test "data formats are displayed inline as plain text unless downloaded", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      stub(PseudoFS, :stat, fn _, _ -> {:ok, %StatResponse{kind: :FILE, size: byte_size(@content)}} end)
      stub(PseudoFS, :stream_file, fn _, _, offset, length -> {:ok, [binary_part(@content, offset, length)]} end)

      for path <- ["/values.yaml", "/data/report.json", "/data/clusters.csv"] do
        conn =
          conn
          |> recycle()
          |> add_auth_headers(user)
          |> get("/v1/workbenches/files/download", %{"id" => workbench.id, "path" => path})

        assert response(conn, 200) == @content
        assert get_resp_header(conn, "content-type") == ["text/plain; charset=utf-8"]
        assert [disposition] = get_resp_header(conn, "content-disposition")
        assert disposition =~ "inline"
      end

      conn =
        conn
        |> recycle()
        |> add_auth_headers(user)
        |> get("/v1/workbenches/files/download", %{"id" => workbench.id, "path" => "/data/report.json", "download" => "true"})

      assert [ct] = get_resp_header(conn, "content-type")
      assert ct =~ "application/json"
      assert [disposition] = get_resp_header(conn, "content-disposition")
      assert disposition =~ "attachment"
    end

    test "it serves byte ranges", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])

      for {range, body, content_range} <- [
        {"bytes=2-5", "2345", "bytes 2-5/10"},
        {"bytes=7-", "789", "bytes 7-9/10"},
        {"bytes=-3", "789", "bytes 7-9/10"},
        {"bytes=8-100", "89", "bytes 8-9/10"}
      ] do
        conn =
          conn
          |> recycle()
          |> add_auth_headers(user)
          |> put_req_header("range", range)
          |> get("/v1/workbenches/files/download", %{"id" => workbench.id, "path" => "/videos/clip.mp4"})

        assert response(conn, 206) == body
        assert get_resp_header(conn, "content-range") == [content_range]
      end
    end

    test "it rejects unsatisfiable ranges", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])

      conn =
        conn
        |> add_auth_headers(user)
        |> put_req_header("range", "bytes=20-30")
        |> get("/v1/workbenches/files/download", %{"id" => workbench.id, "path" => "/videos/clip.mp4"})

      assert response(conn, 416)
      assert get_resp_header(conn, "content-range") == ["bytes */10"]
    end

    test "pre-signed tokens grant access without headers", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      token = WorkbenchFiles.download_token(workbench.id, "/videos/clip.mp4", user)

      conn = get(conn, "/v1/workbenches/files/download", %{"token" => token, "download" => "true"})

      assert response(conn, 200) == @content
      assert [disposition] = get_resp_header(conn, "content-disposition")
      assert disposition =~ "attachment"
    end

    test "users without access are forbidden", %{conn: conn} do
      workbench = insert(:workbench)

      conn
      |> add_auth_headers(insert(:user))
      |> get("/v1/workbenches/files/download", %{"id" => workbench.id, "path" => "/videos/clip.mp4"})
      |> response(403)
    end

    test "invalid tokens are unauthorized", %{conn: conn} do
      conn
      |> get("/v1/workbenches/files/download", %{"token" => "bogus"})
      |> response(401)
    end
  end
end
