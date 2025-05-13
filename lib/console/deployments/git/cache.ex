defmodule Console.Deployments.Git.Cache do
  @moduledoc """
  Implements a simple filesystem generational cache on top of git.  There are two main operations:

  * fetch(cache, ref, path) -> check out the given git ref and return a tarball at that path, within the cache dir
  * refresh(cache) -> wipe the directory of the disk cache and create a new one fresh

  This should be relatively disk-efficient, and refresh cycles will sync with polling the git repo
  """
  import Console.Deployments.Git.Cmd
  alias Console.Schema.{GitRepository, Service.Git}

  defstruct [:git, :dir, :heads, cache: %{}, changes: %{}]

  defmodule Line do
    @expiry [minutes: -10]
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
    defstruct [:from, :to, :touched, :result]

    def new(from, to, result) do
      %__MODULE__{from: from, to: to, result: result, touched: Timex.now()}
    end

    def touch(%__MODULE__{} = mod), do: %{mod | touched: Timex.now()}

    def expired?(%__MODULE__{touched: touched}) do
      Timex.now()
      |> Timex.shift(@expiry)
      |> Timex.after?(touched)
    end
  end

  def new(%GitRepository{} = git) do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{git: git, dir: dir}
  end

  def get(%__MODULE__{} = cache, %Git{ref: ref, folder: folder, files: [_ | _] = files}),
    do: get(cache, ref, folder, files)
  def get(%__MODULE__{} = cache, %Git{ref: ref, folder: folder}), do: get(cache, ref, folder)

  def get(cache, ref, path, filter \\ fn _ -> true end)
  def get(%__MODULE__{heads: %{}} = cache, ref, path, filter) do
    with {:ok, sha} <- commit(cache, ref),
      do: get_commit(cache, sha, path, filter)
  end
  def get(_, _, _, _), do: {:error, :not_found}

  def fetch(%__MODULE__{} = cache, %Git{ref: ref, folder: folder, files: [_ | _] = files}),
    do: fetch(cache, ref, folder, files)
  def fetch(%__MODULE__{} = cache, %Git{ref: ref, folder: folder}), do: fetch(cache, ref, folder)

  def fetch(%__MODULE__{} = cache, ref, path, filter \\ fn _ -> true end) do
    with {:ok, sha} <- commit(cache, ref),
         {:ok, line} <- find_commit(cache, sha, path, filter),
      do: {:ok, line, put_in(cache.cache[cache_key(sha, path, filter)], line)}
  end

  def refresh(%__MODULE__{git: git, cache: cache, changes: changes} = c) do
    {expired, keep} = Enum.split_with(cache, fn {_, line} -> Line.expired?(line) end)
    Enum.each(expired, fn {_, %Line{file: f}} -> File.rm!(f) end)
    {_, keep_changes} = Enum.split_with(changes, fn {_, line} -> Change.expired?(line) end)
    %{c | heads: heads(git), cache: Map.new(keep), changes: Map.new(keep_changes)}
  end

  def tags(%__MODULE__{heads: heads}) do
    Enum.map(heads, fn
      {"refs/tags/" <> tag, _} -> tag
      _ -> nil
    end)
    |> Enum.filter(& &1)
  end

  defp find_commit(%__MODULE__{git: g, cache: cache} = c, sha, path, filter) do
    cache_key = cache_key(sha, path, filter)
    case Map.get(cache, cache_key) do
      %Line{} = l -> {:ok, Line.touch(l)}
      _ -> new_line(c, cache_key, g, sha, path, filter)
    end
  end

  defp get_commit(%__MODULE__{cache: cache}, sha, path, filter) do
    cache_key = cache_key(sha, path, filter)
    case Map.get(cache, cache_key) do
      %Line{} = l -> {:ok, l}
      _ -> {:error, :not_found}
    end
  end

  def touch(%__MODULE__{cache: c} = cache, %Line{key: key}) do
    case Map.get(c, key) do
      %Line{} = l -> put_in(cache.cache[key], Line.touch(l))
      _ -> cache
    end
  end

  def commit(%__MODULE__{heads: heads}, ref) do
    case sha?(ref) do
      true -> {:ok, ref}
      false -> find_head(heads, ref)
    end
  end

  def cached_changes(%__MODULE__{changes: changes} = c, from, to, folder) do
    key = {from, to, folder}
    with {:cache, nil} <- {:cache, Map.get(changes, key)},
         {:ok, _, _} = result <- changes(c, from, to, folder) do
      line = Change.new(from, to, result)
      {put_in(c.changes[key], line), result}
    else
      {:cache, %Change{result: result} = line} ->
        {put_in(c.changes[key], Change.touch(line)), result}
      err -> {c, err}
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

  defp find_head(heads, ref) do
    case Enum.find_value(potential_refs(ref), &Map.get(heads, &1)) do
      sha when is_binary(sha) -> {:ok, sha}
      _ -> {:error, "could not resolve ref #{ref}"}
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

  defp sha?(ref), do: String.match?(ref, ~r/^[0-9A-Fa-f]{40}$/)

  defp cache_path(dir, sha, path), do: Path.join([dir, "#{sha}-#{Base.encode32(path)}.tgz"])
end
