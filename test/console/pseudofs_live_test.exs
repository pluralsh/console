defmodule Console.PseudoFSLiveTest do
  @moduledoc """
  Runs against a real pseudofs server backed by minio, started with `make testup`.  Excluded unless
  `PSEUDOFS_TEST_ADDR` is set (eg `PSEUDOFS_TEST_ADDR=localhost:9093 mix test --only pseudofs`).
  """
  use ConsoleWeb.ConnCase, async: false
  use Mimic
  alias Console.PseudoFS
  alias Console.Deployments.{Attachments, Workbenches}
  alias Console.AI.Tools.Workbench.Codemode
  alias ReqLLM.Message.ContentPart

  @moduletag :pseudofs

  setup_all do
    start_supervised!({GRPC.Client.Connection,
      name: PseudoFS.Client,
      target: System.get_env("PSEUDOFS_TEST_ADDR"),
      adapter: PseudoFS.Client.adapter()
    })
    :ok
  end

  setup do
    stub(PseudoFS, :enabled?, fn -> true end)
    :ok
  end

  describe "client" do
    test "it supports the full file lifecycle" do
      t = Ecto.UUID.generate()

      {:ok, 6} = PseudoFS.write_text(t, "/docs/readme.md", "hello\n")
      {:ok, _} = PseudoFS.append_text(t, "/docs/readme.md", "an OOMKilled pod\n")
      {:ok, "hello\nan OOMKilled pod\n"} = PseudoFS.read_text(t, "/docs/readme.md")
      {:ok, true} = PseudoFS.dir?(t, "/docs")
      {:ok, [%{path: "/docs", kind: :directory}]} = PseudoFS.iterdir(t, "/")
      {:ok, [%{path: "/docs/readme.md"}]} = PseudoFS.glob(t, "/**/*.md")
      {:ok, [%{path: "/docs/readme.md", line_number: 2}]} = PseudoFS.grep(t, "/", "oomkilled", case_insensitive: true)

      {:ok, error} = with({:error, err} <- PseudoFS.read_text(t, "/missing"), do: {:ok, err})
      assert PseudoFS.error_kind(error) == :not_found

      {:ok, "/archive/readme.md"} = PseudoFS.rename(t, "/docs/readme.md", "/archive/readme.md")
      :ok = PseudoFS.delete(t, "/archive")
      {:ok, false} = PseudoFS.exists(t, "/archive")
    end

    test "it streams files larger than the unary limit" do
      t = Ecto.UUID.generate()
      chunk = :crypto.strong_rand_bytes(1024 * 1024)
      size = 9 * byte_size(chunk) + 4

      {:ok, ^size} = PseudoFS.write_file(t, "/big.bin", Stream.concat(List.duplicate(chunk, 9), ["tail"]))
      {:ok, %{size: ^size}} = PseudoFS.stat(t, "/big.bin")
      {:ok, stream} = PseudoFS.stream_file(t, "/big.bin", size - 6, 6)
      assert Enum.join(stream) == binary_part(chunk, byte_size(chunk) - 2, 2) <> "tail"
    end
  end

  describe "python sandbox" do
    test "it can read, write and search the workbench filesystem" do
      t = Ecto.UUID.generate()

      python = """
      from pathlib import Path
      p = Path('/workbench/reports/summary.md')
      p.write_text('# Summary\\nall good\\n')
      with open('/workbench/reports/log.txt', 'a') as f:
          f.write('line1 OOMKilled\\n')
      {
        'children': sorted(str(c) for c in Path('/workbench/reports').iterdir()),
        'size': p.stat().st_size,
        'glob': [g['path'] for g in glob('/workbench/**/*.md')],
        'grep': [(m['path'], m['line_number']) for m in grep('oomkilled', case_insensitive=True)],
      }
      """

      {:ok, json} = Codemode.implement(%Codemode{tools: [], python: python, workbench_id: t})
      %{"result" => result} = Jason.decode!(json)

      assert result["children"] == ["/workbench/reports/log.txt", "/workbench/reports/summary.md"]
      assert result["size"] == 19
      assert result["glob"] == ["/workbench/reports/summary.md"]
      assert result["grep"] == [["/workbench/reports/log.txt", 1]]
      {:ok, "# Summary\nall good\n"} = PseudoFS.read_text(t, "/reports/summary.md")
    end
  end

  describe "attachments and downloads" do
    test "uploads are inlined into prompts and downloadable by range", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      local = Path.join(System.tmp_dir!(), "live-#{Ecto.UUID.generate()}.png")
      File.write!(local, "0123456789")
      on_exit(fn -> File.rm(local) end)
      upload = %Plug.Upload{path: local, filename: "screen.png", content_type: "image/png"}

      {:ok, job} = Workbenches.create_workbench_job(%{prompt: "look", attachments: [upload]}, workbench.id, user)
      %{attachments: [attachment]} = Console.Repo.preload(job, :attachments)
      {:ok, "0123456789"} = PseudoFS.read_bytes(workbench.id, attachment.path)

      [%ContentPart{type: :text, text: text}, %ContentPart{type: :image, data: "0123456789"}] =
        Attachments.prompt_content(job.prompt, [attachment])
      assert text =~ "/workbench#{attachment.path}"

      conn =
        conn
        |> add_auth_headers(user)
        |> put_req_header("range", "bytes=2-5")
        |> get("/v1/workbenches/files/download", %{"id" => workbench.id, "path" => attachment.path})

      assert response(conn, 206) == "2345"
      assert get_resp_header(conn, "content-range") == ["bytes 2-5/10"]
    end
  end
end
