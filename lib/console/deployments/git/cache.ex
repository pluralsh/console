defmodule Console.Deployments.Git.Cache do
  @moduledoc """
  Implements a simple filesystem generational cache on top of git.  There are two main operations:

  * fetch(cache, ref, path) -> check out the given git ref and return a tarball at that path, within the cache dir
  * refresh(cache) -> wipe the directory of the disk cache and create a new one fresh

  This should be relatively disk-efficient, and refresh cycles will sync with polling the git repo
  """
  import Console.Deployments.Git.Cmd
  require Logger
  alias Console.Schema.{GitRepository, Service.Git}

  defstruct [:git, :dir, :heads, :table]

  defmodule Line do
    @expiry [minutes: -30]
    defstruct [:key, :file, :sha, :digest, :touched, :message]

    def new(key, file, sha, message) do
      %__MODULE__{
        key: key,
        file: file,
        digest: Console.sha_file(file),
        sha: sha,
        message: message,
        touched: Timex.now()
      }
    end

    def touch(%__MODULE__{} = mod), do: %{mod | touched: Timex.now()}

    def expired?(%__MODULE__{touched: touched}) do
      Timex.now()
      |> Timex.shift(@expiry)
      |> Timex.after?(touched)
    end
  end

  defmodule Change do
    @expiry [hours: -1]
    defstruct [:from, :to, :touched, :result, :key]

    def new(key, from, to, result) do
      %__MODULE__{key: key, from: from, to: to, result: result, touched: Timex.now()}
    end

    def touch(%__MODULE__{} = mod), do: %{mod | touched: Timex.now()}

    def expired?(%__MODULE__{touched: touched}) do
      Timex.now()
      |> Timex.shift(@expiry)
      |> Timex.after?(touched)
    end
  end

  def new(%GitRepository{} = git, table) do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{git: git, dir: dir, table: table}
  end

  def get(%__MODULE__{table: t}, ref), do: get(t, ref)

  def get(tid, %Git{ref: ref, folder: folder, files: [_ | _] = files}),
    do: get(tid, ref, folder, files)
  def get(tid, %Git{ref: ref, folder: folder}), do: get(tid, ref, folder)

  def get(tid, ref, path, filter \\ fn _ -> true end)
  def get(%__MODULE__{table: t}, ref, path, filter), do: get(t, ref, path, filter)
  def get(tid, ref, path, filter) do
    with {:ok, sha} <- commit(tid, ref),
      do: get_commit(tid, sha, path, filter)
  end

  def fetch(%__MODULE__{} = cache, %Git{ref: ref, folder: folder, files: [_ | _] = files}),
    do: fetch(cache, ref, folder, files)
  def fetch(%__MODULE__{} = cache, %Git{ref: ref, folder: folder}), do: fetch(cache, ref, folder)

  def fetch(%__MODULE__{} = cache, ref, path, filter \\ fn _ -> true end) do
    with {:ok, sha} <- commit(cache, ref),
         {:ok, line} <- find_commit(cache, sha, path, filter),
      do: {:ok, line, %{cache | table: store(cache.table, line)}}
  end

  def refresh(%__MODULE__{git: git, table: tid} = c) do
    count = :ets.foldl(fn
      {{:head, _} = key, _}, acc ->
        :ets.delete(tid, key)
        acc
      {key, l}, acc ->
        case maybe_expire?(l) do
          true ->
            :ets.delete(tid, key)
            acc + 1
          false -> acc
        end
    end, 0, tid)

    Logger.info "Deleted #{count} expired entries for git cache #{git.url}"

    tid = store_heads(tid, heads(git))
    %{c | table: tid}
  end

  defp maybe_expire?(%Line{file: f} = l) do
    case Line.expired?(l) do
      true ->
        File.rm!(f)
        true
      _ -> false
    end
  end
  defp maybe_expire?(%Change{} = c), do: Change.expired?(c)

  def tags(%__MODULE__{table: tid}) do
    :ets.match(tid, {{:head, :"$1"}, :_})
    |> Enum.map(fn
      ["refs/tags/" <> tag] -> tag
      _ -> nil
    end)
    |> Enum.filter(& &1)
  end

  def all_heads(%__MODULE__{table: tid}) do
    :ets.match(tid, {{:head, :"$1"}, :_})
    |> Enum.flat_map(& &1)
  end

  defp find_commit(%__MODULE__{git: g, table: tid} = c, sha, path, filter) do
    cache_key = cache_key(sha, path, filter)
    case get_commit(tid, sha, path, filter) do
      {:ok, %Line{} = l} -> {:ok, Line.touch(l)}
      _ -> new_line(c, cache_key, g, sha, path, filter)
    end
  end

  defp get_commit(%__MODULE__{table: tid}, sha, path, filter),
    do: get_commit(tid, sha, path, filter)
  defp get_commit(tid, sha, path, filter) do
    cache_key = cache_key(sha, path, filter)
    case :ets.lookup(tid, {:line, cache_key}) do
      [{{:line, ^cache_key}, %Line{} = l}] -> {:ok, l}
      _ -> {:error, :not_found}
    end
  end

  def touch(%__MODULE__{table: tid} = cache, %Line{} = line),
    do: %{cache | table: store(tid, Line.touch(line))}
  def touch(%__MODULE__{table: tid} = cache, %Change{} = change),
    do: %{cache | table: store(tid, Change.touch(change))}

  def commit(%__MODULE__{table: tid}, ref), do: commit(tid, ref)
  def commit(tid, ref) do
    case sha?(ref) do
      true -> {:ok, ref}
      false -> find_head(tid, ref)
    end
  end

  def cached_changes(%__MODULE__{table: tid} = c, from, to, folder) do
    with {:cache, nil} <- {:cache, get_change(tid, from, to, folder)},
         {:ok, _, _} = result <- changes(c, from, to, folder) do
      line = Change.new(change_key(from, to, folder), from, to, result)
      {%{c | table: store(tid, line)}, result}
    else
      {:cache, %Change{result: result} = line} ->
        {%{c | table: store(tid, Change.touch(line))}, result}
      err -> {c, err}
    end
  end

  def get_change(tid, from, to, folder) do
    key = change_key(from, to, folder)
    case :ets.lookup(tid, {:change, key}) do
      [{{:change, ^key}, %Change{} = change}] -> change
      _ -> nil
    end
  end

  def changes(%__MODULE__{git: g} = c, sha1, sha2, folder) do
    case file_changes(g, sha1, sha2, folder) do
      {:ok, [""]} -> {:ok, [], ""}
      {:ok, [_ | _] = changes} -> add_msgs(c, changes, sha2)
      {:ok, :pass} -> add_msgs(c, :pass, sha2)
      pass -> pass
    end
  end

  defp add_msgs(%__MODULE__{git: g}, changes, sha) do
    case msg(g, sha) do
      {:ok, msg} -> {:ok, changes, msg}
      _ -> {:ok, changes, ""}
    end
  end

  defp new_line(cache, key, repo, sha, path, filter) do
    with {:ok, _} <- git(repo, "checkout", ["-f", sha]),
         {:ok, msg} <- msg(repo),
         {:ok, f} <- tarball(cache, sha, path, filter),
      do: {:ok, Line.new(key, f, sha, msg)}
  end

  defp find_head(tid, ref) do
    case Enum.find_value(potential_refs(ref), &get_head(tid, &1)) do
      sha when is_binary(sha) -> {:ok, sha}
      _ -> {:error, "could not resolve ref #{ref}"}
    end
  end

  defp get_head(tid, ref) do
    case :ets.lookup(tid, {:head, ref}) do
      [{{:head, ^ref}, sha}] -> sha
      _ -> nil
    end
  end

  defp potential_refs(ref) do
    [ref, "refs/remotes/origin/#{ref}", "refs/heads/#{ref}", "refs/tags/#{ref}"]
  end

  defp tarball(%__MODULE__{git: git, dir: dir}, sha, path, filter) do
    p = cache_path(dir, sha, path)
    case File.exists?(p) do
      true -> {:ok, p}
      false -> tarball(git, path, p, filter)
    end
  end

  defp tarball(%GitRepository{dir: dir}, path, tgz_path, [_ | _] = files) do
    subpath = Path.join(dir, path)
    additional_files = Enum.map(files, &Path.join(dir, &1))
                       |> Enum.map(& {to_charlist(Path.basename(&1)), to_charlist(&1)})

    Console.ls_r(subpath)
    |> Enum.map(&tar_path(&1, subpath))
    |> Enum.concat(additional_files)
    |> case do
      [_ | _] = files -> tar_files(files, tgz_path)
      [] -> {:error, "folder is empty"}
    end
  end

  defp tarball(%GitRepository{dir: dir}, path, tgz_path, filter) when is_function(filter) do
    subpath = Path.join(dir, path)

    Console.ls_r(subpath)
    |> Enum.filter(filter)
    |> Enum.map(&tar_path(&1, subpath))
    |> case do
      [_ | _] = files -> tar_files(files, tgz_path)
      [] -> {:error, "folder is empty"}
    end
  end

  defp tar_files(files, tgz_file) do
    to_charlist(tgz_file)
    |> :erl_tar.create(files, [:compressed])
    |> case do
      :ok -> {:ok, tgz_file}
      error -> error
    end
  end

  defp tar_path(filename, repo_path) do
    relative_path = Path.relative_to(filename, repo_path) |> to_charlist()
    {relative_path, to_charlist(filename)}
  end

  defp cache_key(sha, path, [_ | _] = filter), do: {sha, path, filter}
  defp cache_key(sha, path, _), do: {sha, path}

  defp change_key(from, to, folder), do: {from, to, folder}

  defp store(tid, %Line{key: k} = line) do
    :ets.insert(tid, {{:line, k}, line})
    tid
  end

  defp store(tid, %Change{key: k} = change) do
    :ets.insert(tid, {{:change, k}, change})
    tid
  end

  defp store_heads(tid, heads) do
    :ets.insert(tid, Enum.map(heads, fn {k, v} -> {{:head, k}, v} end))
    tid
  end

  defp sha?(ref), do: String.match?(ref, ~r/^[0-9A-Fa-f]{40}$/)

  defp cache_path(dir, sha, path), do: Path.join([dir, "#{sha}-#{Base.encode32(path)}.tgz"])
end
