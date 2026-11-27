defmodule ConsoleWeb.WorkbenchFilesController do
  use ConsoleWeb, :controller
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
  alias Console.AI.Workbench.Filesystem, as: Mount
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.User

  @grep_opts ~w(fixed_string case_insensitive before_context after_context max_matches)a

  def index(conn, %{"id" => id} = params) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, bench} <- WorkbenchFiles.authorize(id, user, :read),
         {:ok, path} <- Files.tenant_path(params["path"] || "/"),
         {:ok, files} <- WorkbenchFiles.list(bench, path) do
      json(conn, %{files: Enum.map(files, &file_json/1)})
    else
      error -> send_error(conn, error)
    end
  end

  def stat(conn, %{"id" => id, "path" => path}) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, bench} <- WorkbenchFiles.authorize(id, user, :read),
         {:ok, path} <- Files.tenant_path(path),
         {:ok, file} <- WorkbenchFiles.stat(bench, path) do
      json(conn, %{file: file_json(file)})
    else
      error -> send_error(conn, error)
    end
  end
  def stat(conn, _), do: send_error(conn, {:error, "path is required"})

  def content(conn, %{"id" => id, "path" => path}) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, bench} <- WorkbenchFiles.authorize(id, user, :read),
         {:ok, path} <- Files.tenant_path(path),
         {:ok, body} <- Files.read(bench, path, user) do
      json(conn, content_json(body))
    else
      error -> send_error(conn, error)
    end
  end
  def content(conn, _), do: send_error(conn, {:error, "path is required"})

  def download(conn, %{"id" => id, "path" => path} = params) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, path} <- Files.tenant_path(path),
         {:ok, _} <- WorkbenchFiles.authorize(id, user, :read) do
      ConsoleWeb.WorkbenchFileController.download(conn, Map.put(params, "path", path))
    else
      error -> send_error(conn, error)
    end
  end
  def download(conn, _), do: send_error(conn, {:error, "path is required"})

  def glob(conn, %{"id" => id, "pattern" => pattern} = params) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, bench} <- WorkbenchFiles.authorize(id, user, :read),
         {:ok, pattern} <- Files.tenant_path(pattern),
         {:ok, max} <- max_results(params["max_results"]),
         {:ok, files} <- WorkbenchFiles.glob(bench, pattern, max) do
      json(conn, %{files: Enum.map(files, &file_json/1)})
    else
      error -> send_error(conn, error)
    end
  end
  def glob(conn, _), do: send_error(conn, {:error, "pattern is required"})

  def grep(conn, %{"id" => id, "pattern" => pattern} = params) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, bench} <- WorkbenchFiles.authorize(id, user, :read),
         {:ok, path} <- Files.tenant_path(params["path"] || "/"),
         {:ok, matches} <- WorkbenchFiles.grep(bench, pattern, grep_args(params, path)) do
      json(conn, %{matches: Enum.map(matches, &grep_json/1)})
    else
      error -> send_error(conn, error)
    end
  end
  def grep(conn, _), do: send_error(conn, {:error, "pattern is required"})

  def write(conn, %{"id" => id, "path" => path, "content" => content}) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, path} <- Files.tenant_path(path),
         :ok <- Files.cap_write(content),
         {:ok, file} <- WorkbenchFiles.write_file(%{path: path, content: content}, id, user) do
      json(conn, %{file: file_json(file)})
    else
      error -> send_error(conn, error)
    end
  end
  def write(conn, _), do: send_error(conn, {:error, "path and content are required"})

  def mkdir(conn, %{"id" => id, "path" => path}) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, path} <- Files.tenant_path(path),
         {:ok, file} <- WorkbenchFiles.create_directory(path, id, user) do
      json(conn, %{file: file_json(file)})
    else
      error -> send_error(conn, error)
    end
  end
  def mkdir(conn, _), do: send_error(conn, {:error, "path is required"})

  def move(conn, %{"id" => id, "source" => source, "target" => target}) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, source} <- Files.tenant_path(source),
         {:ok, target} <- Files.tenant_path(target),
         {:ok, file} <- WorkbenchFiles.move_file(source, target, id, user) do
      json(conn, %{file: file_json(file)})
    else
      error -> send_error(conn, error)
    end
  end
  def move(conn, _), do: send_error(conn, {:error, "source and target are required"})

  def delete(conn, %{"id" => id, "path" => path}) do
    with :ok <- own_workbench(conn, id),
         {:ok, user} <- fetch_user(conn),
         {:ok, path} <- Files.tenant_path(path),
         {:ok, file} <- WorkbenchFiles.delete_file(path, id, user) do
      json(conn, %{file: file_json(file)})
    else
      error -> send_error(conn, error)
    end
  end
  def delete(conn, _), do: send_error(conn, {:error, "path is required"})

  defp own_workbench(%Plug.Conn{assigns: %{devbox_instance: %{workbench_id: id}}}, id), do: :ok
  defp own_workbench(%Plug.Conn{assigns: %{devbox_instance: _}}, _), do: {:error, :devbox}
  defp own_workbench(_, _), do: :ok

  defp fetch_user(conn) do
    case Guardian.Plug.current_resource(conn) do
      %User{} = user -> {:ok, user}
      _ -> {:error, :unauthorized}
    end
  end

  defp file_json(file) do
    %{
      path: Mount.virtual(file.path),
      name: file.name,
      kind: file.kind,
      size: Map.get(file, :size),
      modified_at: Map.get(file, :modified_at)
    }
  end

  defp content_json({:text, text}), do: %{content: text}
  defp content_json({:download, url, size}), do: %{content: nil, download_url: url, size: size}

  defp grep_json(match) do
    %{
      path: Mount.virtual(match.path),
      line_number: match.line_number,
      line: match.line,
      before: match.before,
      after: match.after
    }
  end

  defp grep_args(params, path) do
    Map.new(@grep_opts, fn key -> {key, params[Atom.to_string(key)]} end)
    |> Map.put(:path, path)
  end

  defp max_results(nil), do: {:ok, nil}
  defp max_results(n) when is_integer(n) and n > 0, do: {:ok, n}
  defp max_results(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, ""} when i > 0 -> {:ok, i}
      _ -> {:error, "max_results must be a positive integer"}
    end
  end
  defp max_results(_), do: {:error, "max_results must be a positive integer"}

  defp send_error(conn, {:error, :devbox}),
    do: send_resp(conn, 403, "devbox instances can only reach their own workbench")
  defp send_error(conn, {:error, :unauthorized}),
    do: send_resp(conn, 401, "Unauthorized")
  defp send_error(conn, {:error, "workbench not found"}),
    do: send_resp(conn, 404, "workbench not found")
  defp send_error(conn, {:error, "forbidden"}),
    do: send_resp(conn, 403, "forbidden")
  defp send_error(conn, {:error, "no such file" <> _ = msg}),
    do: send_resp(conn, 404, msg)
  defp send_error(conn, {:error, msg}) when is_binary(msg),
    do: send_resp(conn, 400, msg)
  defp send_error(conn, _),
    do: send_resp(conn, 403, "forbidden")
end
