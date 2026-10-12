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
