defmodule Console.GraphQl.WorkbenchFilesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PseudoFS
  alias Pseudofs.V1.StatResponse

  setup do
    stub(PseudoFS, :enabled?, fn -> true end)
    :ok
  end

  describe "workbench files" do
    test "readers can list and inspect files" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      wid = workbench.id
      expect(PseudoFS, :iterdir, fn ^wid, "/reports" ->
        {:ok, [
          %{path: "/reports/b.md", name: "b.md", kind: :file},
          %{path: "/reports/2026", name: "2026", kind: :directory}
        ]}
      end)
      expect(PseudoFS, :stat, fn ^wid, "/reports/b.md" ->
        {:ok, %StatResponse{kind: :FILE, size: 42, mtime: 1_760_000_000.0}}
      end)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Files($id: ID!) {
          workbench(id: $id) {
            filesystemEnabled
            files(path: "/reports/") { path name kind sandboxPath }
            file(path: "reports/b.md") { path size modifiedAt downloadUrl }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: user})

      assert found["filesystemEnabled"]
      assert Enum.map(found["files"], & &1["name"]) == ["2026", "b.md"]
      assert Enum.map(found["files"], & &1["kind"]) == ["DIRECTORY", "FILE"]
      assert Enum.map(found["files"], & &1["sandboxPath"]) == ["/workbench/reports/2026", "/workbench/reports/b.md"]
      assert found["file"]["path"] == "/reports/b.md"
      assert found["file"]["size"] == 42
      assert found["file"]["modifiedAt"]
      assert found["file"]["downloadUrl"] =~ "/v1/workbenches/files/download?token="
    end

    test "readers can glob and grep files" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      expect(PseudoFS, :glob, fn _, "/**/*.md", 0 -> {:ok, [%{path: "/a.md", name: "a.md", kind: :file}]} end)
      expect(PseudoFS, :grep, fn _, "/", "error", opts ->
        assert opts[:case_insensitive]
        {:ok, [%{path: "/a.md", line_number: 3, line: "an error", before: [%{line_number: 2, text: "ctx"}], after: []}]}
      end)

      {:ok, %{data: %{"workbench" => found}}} = run_query("""
        query Search($id: ID!) {
          workbench(id: $id) {
            globFiles(pattern: "**/*.md") { path }
            grepFiles(pattern: "error", caseInsensitive: true) { path lineNumber line before { lineNumber text } }
          }
        }
      """, %{"id" => workbench.id}, %{current_user: user})

      assert found["globFiles"] == [%{"path" => "/a.md"}]
      [match] = found["grepFiles"]
      assert match["lineNumber"] == 3
      assert match["before"] == [%{"lineNumber" => 2, "text" => "ctx"}]
    end
  end

  describe "writeWorkbenchFile" do
    test "writers can write files" do
      user = insert(:user)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      wid = workbench.id
      expect(PseudoFS, :write_file, fn ^wid, "/notes/a.md", ["hello"] -> {:ok, 5} end)
      expect(PseudoFS, :stat, fn ^wid, "/notes/a.md" -> {:ok, %StatResponse{kind: :FILE, size: 5}} end)

      {:ok, %{data: %{"writeWorkbenchFile" => file}}} = run_query("""
        mutation Write($id: ID!) {
          writeWorkbenchFile(workbenchId: $id, path: "/notes/a.md", content: "hello") { path size }
        }
      """, %{"id" => workbench.id}, %{current_user: user})

      assert file["path"] == "/notes/a.md"
      assert file["size"] == 5
    end

    test "readers cannot write files" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Write($id: ID!) {
          writeWorkbenchFile(workbenchId: $id, path: "/notes/a.md", content: "hello") { path }
        }
      """, %{"id" => workbench.id}, %{current_user: user})
    end
  end

  describe "deleteWorkbenchFile" do
    test "writers can delete directories" do
      user = insert(:user)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      wid = workbench.id
      expect(PseudoFS, :stat, fn ^wid, "/notes" -> {:ok, %StatResponse{kind: :DIRECTORY}} end)
      expect(PseudoFS, :delete, fn ^wid, "/notes" -> :ok end)

      {:ok, %{data: %{"deleteWorkbenchFile" => file}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteWorkbenchFile(workbenchId: $id, path: "/notes") { path kind }
        }
      """, %{"id" => workbench.id}, %{current_user: user})

      assert file["path"] == "/notes"
      assert file["kind"] == "DIRECTORY"
    end

    test "readers cannot delete files" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($id: ID!) {
          deleteWorkbenchFile(workbenchId: $id, path: "/notes") { path }
        }
      """, %{"id" => workbench.id}, %{current_user: user})
    end
  end

  describe "moveWorkbenchFile" do
    test "writers can move files" do
      user = insert(:user)
      workbench = insert(:workbench, write_bindings: [%{user_id: user.id}])
      expect(PseudoFS, :rename, fn _, "/a.md", "/b/a.md" -> {:ok, "/b/a.md"} end)
      expect(PseudoFS, :stat, fn _, "/b/a.md" -> {:ok, %StatResponse{kind: :FILE, size: 1}} end)

      {:ok, %{data: %{"moveWorkbenchFile" => file}}} = run_query("""
        mutation Move($id: ID!) {
          moveWorkbenchFile(workbenchId: $id, source: "/a.md", target: "/b/a.md") { path }
        }
      """, %{"id" => workbench.id}, %{current_user: user})

      assert file["path"] == "/b/a.md"
    end
  end
end
