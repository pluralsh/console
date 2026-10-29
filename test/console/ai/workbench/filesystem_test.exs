defmodule Console.AI.Workbench.FilesystemTest do
  use ExUnit.Case, async: true
  use Mimic
  alias Console.PseudoFS
  alias Console.AI.Workbench.Filesystem
  alias Pseudofs.V1.StatResponse

  @tenant "a8c4f0e2-2b5e-4d3a-9a77-0d0b6f3c9f10"

  defp os(fun, args, kwargs \\ %{}), do: Filesystem.os(@tenant)[fun].(args, kwargs)
  defp call(fun, args, kwargs), do: Filesystem.functions(@tenant)[fun].(args, kwargs)

  describe "os/1" do
    test "it maps sandbox paths onto the tenant root" do
      expect(PseudoFS, :read_text, fn @tenant, "/notes/a.md" -> {:ok, "hi"} end)
      assert os(:read_text, [{:path, "/workbench/notes/./b/../a.md"}]) == {:ok, "hi"}

      expect(PseudoFS, :read_text, fn @tenant, "/notes/a.md" -> {:ok, "hi"} end)
      assert os(:read_text, ["notes/a.md"]) == {:ok, "hi"}
    end

    test "it refuses paths outside of /workbench" do
      assert {:error, :permission_error, _} = os(:read_text, [{:path, "/etc/passwd"}])
      assert {:error, :permission_error, _} = os(:read_text, [{:path, "/workbenchx/a"}])
    end

    test "it translates pseudofs errors into python exceptions" do
      expect(PseudoFS, :read_text, fn _, _ -> {:error, %GRPC.RPCError{status: 5, message: "no such file or directory: '/a'"}} end)
      assert {:error, :file_not_found_error, "[Errno 2] No such file or directory: '/workbench/a'"} = os(:read_text, [{:path, "/workbench/a"}])

      expect(PseudoFS, :rmdir, fn _, _ -> {:error, %GRPC.RPCError{status: 9, message: "directory not empty: '/a'"}} end)
      assert {:error, :os_error, "[Errno 39]" <> _} = os(:rmdir, [{:path, "/workbench/a"}])

      expect(PseudoFS, :read_text, fn _, _ -> {:error, %GRPC.RPCError{status: 9, message: "is a directory: '/a'"}} end)
      assert {:error, :is_a_directory_error, _} = os(:read_text, [{:path, "/workbench/a"}])
    end

    test "it returns python-shaped results" do
      expect(PseudoFS, :read_bytes, fn _, "/a.bin" -> {:ok, <<1, 2>>} end)
      assert os(:read_bytes, [{:path, "/workbench/a.bin"}]) == {:ok, {:bytes, <<1, 2>>}}

      expect(PseudoFS, :iterdir, fn _, "/" -> {:ok, [%{path: "/a", name: "a", kind: :directory}]} end)
      assert os(:iterdir, [{:path, "/workbench"}]) == {:ok, [{:path, "/workbench/a"}]}

      expect(PseudoFS, :rename, fn _, "/a", "/b/a" -> {:ok, "/b/a"} end)
      assert os(:rename, [{:path, "/workbench/a"}, {:path, "/workbench/b/a"}]) == {:ok, {:path, "/workbench/b/a"}}

      expect(PseudoFS, :open, fn _, "/log", "a" -> {:ok, %{}} end)
      assert os(:open, [{:path, "/workbench/log"}, "a"]) ==
        {:ok, {:file_handle, %{path: "/workbench/log", mode: "a", position: 0}}}

      expect(PseudoFS, :append_text, fn _, "/log", "héllo" -> {:ok, 6} end)
      assert os(:append_text, [{:path, "/workbench/log"}, "héllo"]) == {:ok, 5}

      expect(PseudoFS, :mkdir, fn _, "/d", opts ->
        assert opts[:parents] && opts[:exist_ok]
        :ok
      end)
      assert os(:mkdir, [{:path, "/workbench/d"}], %{"parents" => true, "exist_ok" => true}) == {:ok, nil}

      expect(PseudoFS, :stat, fn _, "/d" -> {:ok, %StatResponse{kind: :DIRECTORY, mode: 0o755, size: 0, mtime: 1.0}} end)
      {:ok, {:named_tuple, "StatResult", fields}} = os(:stat, [{:path, "/workbench/d"}])
      assert Bitwise.band(Map.new(fields)["st_mode"], 0o040_000) != 0
    end

    test "it returns type errors instead of raising on non-string values like sql rows" do
      row = ["plrl-dev", "gp2", 10, 100, nil]

      assert os(:write_text, [{:path, "/workbench/out.txt"}, row]) ==
        {:error, :type_error, "data must be str, not list"}
      assert os(:append_text, [{:path, "/workbench/out.txt"}, row]) ==
        {:error, :type_error, "data must be str, not list"}
      assert os(:read_text, [row]) == {:error, :type_error, "expected a str or Path, not list"}
    end
  end

  describe "functions/1" do
    test "glob accepts positional and keyword arguments" do
      expect(PseudoFS, :glob, fn @tenant, "/**/*.md", 5 -> {:ok, [%{path: "/a.md", name: "a.md", kind: :file}]} end)

      assert call("glob", ["/workbench/**/*.md"], %{"max_results" => 5}) ==
        {:ok, [%{"path" => "/workbench/a.md", "name" => "a.md", "kind" => "file"}]}
    end

    test "grep forwards options and maps results" do
      expect(PseudoFS, :grep, fn @tenant, "/logs", "oom", opts ->
        assert opts[:case_insensitive]
        assert opts[:after_context] == 2
        {:ok, [%{path: "/logs/a.txt", line_number: 3, line: "OOM", before: [], after: [%{line_number: 4, text: "x"}]}]}
      end)

      assert {:ok, [match]} = call("grep", ["oom"], %{"path" => "/workbench/logs", "case_insensitive" => true, "after_context" => 2})
      assert match["path"] == "/workbench/logs/a.txt"
      assert match["after"] == [%{"line_number" => 4, "text" => "x"}]
    end

    test "grep requires a pattern" do
      assert {:error, :type_error, _} = call("grep", [], %{})
    end

    test "read_csv parses headed rows, quoted cells and ragged rows" do
      csv = "\uFEFFname,cpu\r\nmgmt,\"1,5\"\r\nprod\r\ndev,2,extra\r\n"
      expect(PseudoFS, :read_text, fn @tenant, "/_plrl_/uploads/1/clusters.csv" -> {:ok, csv} end)

      assert {:ok, result} = call("read_csv", ["/workbench/_plrl_/uploads/1/clusters.csv"], %{})
      assert result["columns"] == ["name", "cpu"]
      assert result["rows"] == [
        %{"name" => "mgmt", "cpu" => "1,5"},
        %{"name" => "prod", "cpu" => nil},
        %{"name" => "dev", "cpu" => "2", "_extra" => ["extra"]}
      ]
      assert result["row_count"] == 3
      refute result["truncated"]
      assert result["errors"] == []
    end

    test "read_csv infers tabs for tsv files and supports headerless text and row limits" do
      expect(PseudoFS, :read_text, fn @tenant, "/a.tsv" -> {:ok, "a\tb\n1\t2\n3\t4\n"} end)
      assert {:ok, %{"rows" => [%{"a" => "1", "b" => "2"}], "row_count" => 2, "truncated" => true}} =
        call("read_csv", [{:path, "/workbench/a.tsv"}], %{"max_rows" => 1})

      assert {:ok, %{"columns" => nil, "rows" => [["a", "b"], ["1", "2"]]}} =
        call("read_csv", [], %{"text" => "a;b\n1;2", "delimiter" => ";", "header" => false})

      assert {:error, :type_error, _} = call("read_csv", [], %{})
      assert {:error, :value_error, _} = call("read_csv", [], %{"text" => "a", "delimiter" => "::"})
    end

    test "write_csv encodes dict rows with a header" do
      expect(PseudoFS, :write_text, fn @tenant, "/reports/out.csv", csv ->
        assert csv == "name,cpu,ok\nmgmt,\"1,5\",True\nprod,,False\n"
        {:ok, %{}}
      end)

      rows = [%{"name" => "mgmt", "cpu" => "1,5", "ok" => true}, %{"name" => "prod", "ok" => false}]
      assert call("write_csv", ["/workbench/reports/out.csv", rows], %{"columns" => ["name", "cpu", "ok"]}) ==
        {:ok, "/workbench/reports/out.csv"}

      expect(PseudoFS, :write_text, fn @tenant, "/out.tsv", "1\t2\n" -> {:ok, %{}} end)
      assert {:ok, _} = call("write_csv", ["/workbench/out.tsv", [[1, 2]]], %{})

      assert {:error, :type_error, _} = call("write_csv", ["/workbench/x.csv", [%{"a" => 1}, [1]]], %{})
    end

    test "read_yaml returns every document" do
      expect(PseudoFS, :read_text, fn @tenant, "/values.yaml" -> {:ok, "a: 1\nb: [x, true, null]\n---\nc: d\n"} end)
      assert call("read_yaml", ["/workbench/values.yaml"], %{}) ==
        {:ok, [%{"a" => 1, "b" => ["x", true, nil]}, %{"c" => "d"}]}

      assert {:error, :value_error, "invalid yaml" <> _} = call("read_yaml", [], %{"text" => "a: ["})
    end

    test "extract_archive unpacks a zip next to it, sanitizing entry paths" do
      {:ok, {_, zip}} = :zip.create(~c"bundle.zip", [
        {~c"logs/app.log", "boom"},
        {~c"../../escape.txt", "x"},
        {~c"__MACOSX/._app.log", "meta"}
      ], [:memory])

      expect(PseudoFS, :stat, fn @tenant, "/_plrl_/uploads/1/bundle.zip" -> {:ok, %StatResponse{size: byte_size(zip)}} end)
      expect(PseudoFS, :read_bytes, fn @tenant, "/_plrl_/uploads/1/bundle.zip" -> {:ok, zip} end)
      expect(PseudoFS, :write_bytes, 2, fn
        @tenant, "/_plrl_/uploads/1/bundle/logs/app.log", "boom" -> {:ok, 4}
        @tenant, "/_plrl_/uploads/1/bundle/escape.txt", "x" -> {:ok, 1}
      end)

      assert call("extract_archive", ["/workbench/_plrl_/uploads/1/bundle.zip"], %{}) == {:ok, %{
        "destination" => "/workbench/_plrl_/uploads/1/bundle",
        "files" => ["/workbench/_plrl_/uploads/1/bundle/logs/app.log", "/workbench/_plrl_/uploads/1/bundle/escape.txt"],
        "file_count" => 2,
        "total_bytes" => 5
      }}
    end

    test "extract_archive unpacks tarballs into an explicit destination" do
      tar = Path.join(System.tmp_dir!(), "fs-test-#{System.unique_integer([:positive])}.tar")
      :ok = :erl_tar.create(String.to_charlist(tar), [{~c"a/b.yaml", "k: v"}])
      data = File.read!(tar)
      File.rm!(tar)

      expect(PseudoFS, :stat, fn _, "/x.tar" -> {:ok, %StatResponse{size: byte_size(data)}} end)
      expect(PseudoFS, :read_bytes, fn _, "/x.tar" -> {:ok, data} end)
      expect(PseudoFS, :write_bytes, fn _, "/out/a/b.yaml", "k: v" -> {:ok, 4} end)

      assert {:ok, %{"files" => ["/workbench/out/a/b.yaml"]}} =
        call("extract_archive", ["/workbench/x.tar"], %{"destination" => "/workbench/out"})
    end

    test "extract_archive rejects gzip and oversized archives" do
      gz = :zlib.gzip("hello")
      expect(PseudoFS, :stat, fn _, "/a.tar.gz" -> {:ok, %StatResponse{size: byte_size(gz)}} end)
      expect(PseudoFS, :read_bytes, fn _, "/a.tar.gz" -> {:ok, gz} end)
      assert {:error, :value_error, "a.tar.gz is not a zip or tar archive" <> _} =
        call("extract_archive", ["/workbench/a.tar.gz"], %{})

      expect(PseudoFS, :stat, fn _, "/big.zip" -> {:ok, %StatResponse{size: 200 * 1024 * 1024}} end)
      assert {:error, :value_error, "archives larger than" <> _} = call("extract_archive", ["/workbench/big.zip"], %{})
    end
  end

  describe "codemode docs" do
    test "the filesystem is documented only when configured for a workbench" do
      alias Console.AI.Tools.Workbench.Codemode

      stub(PseudoFS, :enabled?, fn -> true end)
      assert Codemode.description(%Codemode{tools: [], workbench_id: @tenant}) =~ "## Workbench filesystem"
      refute Codemode.description(%Codemode{tools: []}) =~ "## Workbench filesystem"

      stub(PseudoFS, :enabled?, fn -> false end)
      refute Codemode.description(%Codemode{tools: [], workbench_id: @tenant}) =~ "## Workbench filesystem"
    end
  end
end
