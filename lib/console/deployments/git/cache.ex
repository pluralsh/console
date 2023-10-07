defmodule Console.Deployments.Git.Cache do
  @moduledoc """
  Implements a simple filesystem generational cache on top of git.  There are two main operations:

  * fetch(cache, ref, path) -> check out the given git ref and return a tarball at that path, within the cache dir
  * refresh(cache) -> wipe the directory of the disk cache and create a new one fresh

  This should be relatively disk-efficient, and refresh cycles will sync with polling the git repo
  """
  import Console.Deployments.Git.Cmd
  alias Console.Schema.GitRepository

  defstruct [:git, :dir]

  def new(%GitRepository{} = git) do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{git: git, dir: dir}
  end

  def fetch(%__MODULE__{git: repo} = cache, ref, path) do
    with {:ok, _} <- git(repo, "checkout", [ref]),
         {:ok, sha} <- sha(repo),
         {:ok, msg} <- msg(repo),
         {:ok, f} <- tarball(cache, sha, path),
      do: {:ok, sha, msg, f}
  end

  def refresh(%__MODULE__{dir: dir} = cache) do
    {:ok, new_dir} = Briefly.create(directory: true)
    File.rm_rf!(dir)
    %{cache | dir: new_dir}
  end

  defp tarball(%__MODULE__{git: git, dir: dir}, sha, path) do
    p = cache_path(dir, sha, path)
    case File.exists?(p) do
      true -> {:ok, p}
      false -> tarball(git, path, p)
    end
  end

  defp tarball(%GitRepository{dir: dir}, path, tgz_path) do
    subpath = Path.join(dir, path)

    to_charlist(tgz_path)
    |> :erl_tar.create(Enum.map(Console.ls_r(subpath), &tar_path(&1, subpath)), [:compressed])
    |> case do
      :ok -> {:ok, tgz_path}
      error -> error
    end
  end

  defp tar_path(filename, repo_path) do
    relative_path = Path.relative_to(filename, repo_path) |> to_charlist()
    {relative_path, to_charlist(filename)}
  end

  defp cache_path(dir, sha, path), do: Path.join([dir, "#{sha}-#{Base.encode32(path)}.tgz"])
end
