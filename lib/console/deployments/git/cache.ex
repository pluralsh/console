defmodule Console.Deployments.Git.Cache do
  @moduledoc """
  Implements a simple filesystem generational cache on top of git.  There are two main operations:

  * fetch(cache, ref, path) -> check out the given git ref and return a tarball at that path, within the cache dir
  * refresh(cache) -> wipe the directory of the disk cache and create a new one fresh

  This should be relatively disk-efficient, and refresh cycles will sync with polling the git repo
  """
  import Console.Deployments.Git.Cmd
  alias Console.Schema.{GitRepository, Service.Git}

  defstruct [:git, :dir, :heads, cache: %{}]

  defmodule Line do
    @expiry [minutes: -10]
    defstruct [:file, :sha, :touched, :message]

    def new(file, sha, message) do
      %__MODULE__{file: file, sha: sha, message: message, touched: Timex.now()}
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

  def fetch(%__MODULE__{} = cache, %Git{ref: ref, folder: folder, files: [_ | _] = files}),
    do: fetch(cache, ref, folder, files)
  def fetch(%__MODULE__{} = cache, %Git{ref: ref, folder: folder}), do: fetch(cache, ref, folder)

  def fetch(%__MODULE__{} = cache, ref, path, filter \\ fn _ -> true end) do
    with {:ok, sha} <- commit(cache, ref),
         {:ok, line} <- find_commit(cache, sha, path, filter),
      do: {:ok, line, put_in(cache.cache[cache_key(sha, path, filter)], line)}
  end

  def refresh(%__MODULE__{git: git, cache: cache} = c) do
    {expired, keep} = Enum.split_with(cache, fn {_, line} -> Line.expired?(line) end)
    Enum.each(expired, fn {_, %Line{file: f}} -> File.rm!(f) end)
    %{c | heads: heads(git), cache: Map.new(keep)}
  end

  defp find_commit(%__MODULE__{git: g, cache: cache} = c, sha, path, filter) do
    cache_key = cache_key(sha, path, filter)
    case Map.get(cache, cache_key) do
      %Line{} = l -> {:ok, Line.touch(l)}
      _ -> new_line(c, g, sha, path, filter)
    end
  end

  def commit(%__MODULE__{heads: heads}, ref) do
    case sha?(ref) do
      true -> {:ok, ref}
      false -> find_head(heads, ref)
    end
  end

  def changes(%__MODULE__{git: g} = c, sha1, sha2, folder) do
    case file_changes(g, sha1, sha2, folder) do
      {:ok, [""]} -> {:ok, []}
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

  defp new_line(cache, repo, sha, path, filter) do
    with {:ok, _} <- git(repo, "checkout", [sha]),
         {:ok, msg} <- msg(repo),
         {:ok, f} <- tarball(cache, sha, path, filter),
      do: {:ok, Line.new(f, sha, msg)}
  end

  defp find_head(heads, ref) do
    case Enum.find_value([ref, "refs/heads/#{ref}", "refs/tags/#{ref}"], &Map.get(heads, &1)) do
      sha when is_binary(sha) -> {:ok, sha}
      _ -> {:error, "could not resolve ref #{ref}"}
    end
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
