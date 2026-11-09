defmodule Console.Deployments.Git.CacheTest do
  use ExUnit.Case, async: true

  alias Console.Deployments.Git.Cache
  alias Console.Schema.Service.Git

  setup do
    tid = :ets.new(:git_cache_entries, [:set, :protected, read_concurrency: true])
    %{tid: tid}
  end

  describe "read_commit/2" do
    test "returns the sha from the heads table and the message on that line", %{tid: tid} do
      sha = String.duplicate("a", 40)
      touched = ~U[2020-01-01 00:00:00Z]
      insert_head(tid, "main", sha)
      insert_line(tid, {sha, "charts"}, %{sha: sha, message: "ship it", touched: touched})

      assert Cache.read_commit(tid, git("main", "charts")) == {:ok, sha, "ship it"}

      [{{:line, _}, stored}] = :ets.lookup(tid, {:line, {sha, "charts"}})
      assert stored.touched == touched
    end

    test "a cache struct reads the same table", %{tid: tid} do
      sha = String.duplicate("b", 40)
      insert_head(tid, "main", sha)
      insert_line(tid, {sha, "charts"}, %{sha: sha, message: "from struct"})

      assert Cache.read_commit(%Cache{table: tid}, git("main", "charts")) == {:ok, sha, "from struct"}
    end

    test "a file filter uses the same key as a files cache line", %{tid: tid} do
      sha = String.duplicate("c", 40)
      files = ["values.yaml", "script.lua"]
      insert_head(tid, "main", sha)
      insert_line(tid, {sha, "charts"}, %{sha: sha, message: "folder"})
      insert_line(tid, {sha, "charts", files}, %{sha: sha, message: "files"})

      assert Cache.read_commit(tid, git("main", "charts", files)) == {:ok, sha, "files"}
      assert Cache.read_commit(tid, git("main", "charts")) == {:ok, sha, "folder"}
      assert Cache.read_commit(tid, git("main", "charts", [])) == {:ok, sha, "folder"}
    end

    test "a resolved sha with no cache line returns a nil message", %{tid: tid} do
      sha = String.duplicate("d", 40)
      insert_head(tid, "main", sha)

      assert Cache.read_commit(tid, git("main", "charts")) == {:ok, sha, nil}
    end

    test "a 40-character ref is the sha and does not need a head", %{tid: tid} do
      sha = String.duplicate("e", 40)
      insert_line(tid, {sha, "charts"}, %{sha: sha, message: "direct"})

      assert Cache.read_commit(tid, git(sha, "charts")) == {:ok, sha, "direct"}
    end

    test "a missing head is an error and writes nothing", %{tid: tid} do
      assert Cache.read_commit(tid, git("missing", "charts")) ==
               {:error, "could not resolve ref missing"}

      assert :ets.tab2list(tid) == []
    end
  end

  defp git(ref, folder, files \\ nil), do: %Git{ref: ref, folder: folder, files: files}

  defp insert_head(tid, ref, sha) do
    :ets.insert(tid, {{:head, "refs/heads/#{ref}"}, sha})
  end

  defp insert_line(tid, key, attrs) do
    :ets.insert(tid, {{:line, key}, struct(Cache.Line, Map.put(attrs, :key, key))})
  end
end
