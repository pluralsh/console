defmodule Console.Deployments.WorkbenchFiles do
  @moduledoc """
  User-facing operations on a workbench's filesystem.  Reads require workbench read access and
  mutations require write access.  Paths are absolute within the workbench's tenant, which the
  python sandbox mounts at `/workbench`.
  """
  import Console.Deployments.Policies
  alias Console.PseudoFS
  alias Console.AI.Workbench.Filesystem
  alias Console.Deployments.Workbenches
  alias Console.Schema.{User, Workbench}
  alias Pseudofs.V1.StatResponse

  @token_salt "workbench-file-download"
  @token_max_age 60 * 60

  @type file :: %{path: binary, name: binary, kind: :file | :directory, size: integer | nil, modified_at: DateTime.t | nil, workbench_id: binary}
  @type error :: {:error, binary}

  @spec enabled?() :: boolean
  def enabled?(), do: PseudoFS.enabled?()

  @doc "lists the direct children of a directory, directories first"
  @spec list(Workbench.t, binary) :: {:ok, [file]} | error
  def list(%Workbench{id: id}, path) do
    with {:ok, path} <- normalize(path),
         {:ok, entries} <- call(fn -> PseudoFS.iterdir(id, path) end) do
      entries
      |> Enum.map(&Map.put(&1, :workbench_id, id))
      |> Enum.sort_by(&{&1.kind != :directory, &1.name})
      |> then(&{:ok, &1})
    end
  end

  @spec stat(Workbench.t, binary) :: {:ok, file} | error
  def stat(%Workbench{id: id}, path) do
    with {:ok, path} <- normalize(path),
         {:ok, stat} <- call(fn -> PseudoFS.stat(id, path) end),
      do: {:ok, to_file(id, path, stat)}
  end

  @doc "reads a file as text, for previews"
  @spec read_text(Workbench.t, binary) :: {:ok, binary} | error
  def read_text(%Workbench{id: id}, path) do
    with {:ok, path} <- normalize(path),
      do: call(fn -> PseudoFS.read_text(id, path) end)
  end

  @spec glob(Workbench.t, binary, integer | nil) :: {:ok, [file]} | error
  def glob(%Workbench{id: id}, pattern, max \\ nil) do
    with {:ok, pattern} <- normalize(pattern),
         {:ok, entries} <- call(fn -> PseudoFS.glob(id, pattern, max || 0) end),
      do: {:ok, Enum.map(entries, &Map.put(&1, :workbench_id, id))}
  end

  @spec grep(Workbench.t, binary, map) :: {:ok, [map]} | error
  def grep(%Workbench{id: id}, pattern, args) do
    opts =
      Map.take(args, ~w(fixed_string case_insensitive before_context after_context max_matches)a)
      |> Enum.reject(fn {_, v} -> is_nil(v) end)

    with {:ok, path} <- normalize(Map.get(args, :path) || "/"),
      do: call(fn -> PseudoFS.grep(id, path, pattern, opts) end)
  end

  @doc "writes a file from either a text `content` string or an uploaded `file`"
  @spec write_file(map, binary, User.t) :: {:ok, file} | error
  def write_file(%{path: path} = attrs, id, %User{} = user) do
    with {:ok, bench} <- authorize(id, user, :write),
         {:ok, path} <- normalize(path),
         {:ok, _} <- call(fn -> write(id, path, attrs) end),
      do: stat(bench, path)
  end

  @spec create_directory(binary, binary, User.t) :: {:ok, file} | error
  def create_directory(path, id, %User{} = user) do
    with {:ok, bench} <- authorize(id, user, :write),
         {:ok, path} <- normalize(path),
         :ok <- call(fn -> PseudoFS.mkdir(id, path, parents: true, exist_ok: true) end),
      do: stat(bench, path)
  end

  @spec move_file(binary, binary, binary, User.t) :: {:ok, file} | error
  def move_file(source, target, id, %User{} = user) do
    with {:ok, bench} <- authorize(id, user, :write),
         {:ok, source} <- normalize(source),
         {:ok, target} <- normalize(target),
         {:ok, path} <- call(fn -> PseudoFS.rename(id, source, target) end),
      do: stat(bench, path)
  end

  @doc "deletes a file, or a directory and everything beneath it"
  @spec delete_file(binary, binary, User.t) :: {:ok, file} | error
  def delete_file(path, id, %User{} = user) do
    with {:ok, bench} <- authorize(id, user, :write),
         {:ok, file} <- stat(bench, path),
         :ok <- call(fn -> PseudoFS.delete(id, file.path) end),
      do: {:ok, file}
  end

  @spec authorize(binary, User.t, :read | :write) :: {:ok, Workbench.t} | error
  def authorize(id, %User{} = user, action) do
    case Workbenches.get_workbench(id) do
      %Workbench{} = bench -> allow(bench, user, action)
      nil -> {:error, "workbench not found"}
    end
  end

  @doc "a short-lived token granting download access to a single file, for use where headers can't be set (eg `<video>` tags)"
  @spec download_token(binary, binary, User.t | binary) :: binary
  def download_token(id, path, %User{id: user_id}), do: download_token(id, path, user_id)
  def download_token(id, path, user_id) when is_binary(user_id),
    do: Phoenix.Token.sign(ConsoleWeb.Endpoint, @token_salt, %{w: id, p: path, u: user_id})

  @spec verify_download_token(binary) :: {:ok, {binary, binary, binary}} | {:error, term}
  def verify_download_token(token) do
    with {:ok, %{w: id, p: path, u: user_id}} <- Phoenix.Token.verify(ConsoleWeb.Endpoint, @token_salt, token, max_age: @token_max_age),
      do: {:ok, {id, path, user_id}}
  end

  @doc "the download url for a file, signed for the given user (or user id)"
  @spec download_url(binary, binary, User.t | binary) :: binary
  def download_url(id, path, user) do
    query = URI.encode_query(%{token: download_token(id, path, user)})
    Path.join(Console.url("/v1/workbenches/files/download"), "?#{query}")
    |> String.replace("/?", "?")
  end

  @doc "the sandbox location of a tenant path"
  @spec sandbox_path(binary) :: binary
  def sandbox_path(path), do: Filesystem.virtual(path)

  defp write(id, path, %{file: %Plug.Upload{path: local}}), do: PseudoFS.upload(id, path, local)
  defp write(id, path, %{content: content}) when is_binary(content), do: PseudoFS.write_file(id, path, [content])
  defp write(_, _, _), do: {:error, "one of content or file is required"}

  defp to_file(id, path, %StatResponse{kind: kind, size: size, mtime: mtime}) do
    %{
      path: path,
      name: Path.basename(path),
      kind: PseudoFS.kind(kind),
      size: size,
      modified_at: timestamp(mtime),
      workbench_id: id
    }
  end

  defp timestamp(mtime) when is_float(mtime) and mtime > 0,
    do: DateTime.from_unix!(round(mtime * 1_000_000), :microsecond)
  defp timestamp(_), do: nil

  defp normalize("/" <> _ = path), do: {:ok, String.trim_trailing(path, "/") |> default_root()}
  defp normalize(path) when is_binary(path), do: normalize("/" <> path)
  defp normalize(_), do: {:error, "path is required"}

  defp default_root(""), do: "/"
  defp default_root(path), do: path

  defp call(fun) do
    case enabled?() do
      true -> format(fun.())
      false -> {:error, "the workbench filesystem requires an object store to be configured"}
    end
  end

  defp format({:error, err}), do: {:error, PseudoFS.error_message(err)}
  defp format(res), do: res
end
