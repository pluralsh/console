defmodule Console.AI.Tools.Workbench.Filesystem do
  @moduledoc """
  Shared path and result handling for the workbench filesystem tools.

  Agents address files with sandbox paths under `/workbench`. The workbench API uses tenant
  paths (`/notes/a.md`), so every tool converts before calling `WorkbenchFiles`.
  """
  alias Console.AI.Tools.Workbench.Output
  alias Console.AI.Workbench.Filesystem, as: Mount
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.{User, Workbench}

  @write_cap 1024 * 1024

  @doc "largest text body a write tool or route will accept"
  def write_cap, do: @write_cap

  @doc "converts a sandbox path, a tenant path, or a relative path into a tenant path"
  @spec tenant_path(binary | nil) :: {:ok, binary} | {:error, binary}
  def tenant_path(path) when is_binary(path) do
    case Mount.tenant_path(sandbox(path)) do
      {:ok, tenant} -> {:ok, tenant}
      {:error, msg} -> {:error, msg}
    end
  end
  def tenant_path(_), do: {:error, "path is required"}

  @doc "reads a file, or points at its download url when it is too large or not text"
  @spec read(Workbench.t, binary, User.t) :: {:ok, {:text, binary} | {:download, binary, integer | nil}} | {:error, binary}
  def read(%Workbench{} = bench, path, %User{} = user) do
    with {:ok, file} <- WorkbenchFiles.stat(bench, path),
      do: body(bench, file, user)
  end

  def render_entries([]), do: "directory is empty"
  def render_entries(files), do: Enum.map_join(files, "\n", &render_entry/1)

  def render_file(%{path: path, kind: kind, size: size}) do
    "#{Mount.virtual(path)} #{kind} #{size || 0} bytes"
  end

  def render_read({:text, text}), do: text
  def render_read({:download, url, size}) do
    "file is #{size || "unknown"} bytes and is not returned inline; download #{url}"
  end

  def render_grep([]), do: "no matches"
  def render_grep(matches), do: Enum.map_join(matches, "\n", &render_grep_match/1)

  def cap_write(content) when is_binary(content) and byte_size(content) <= @write_cap, do: :ok
  def cap_write(content) when is_binary(content),
    do: {:error, "content exceeds #{@write_cap} bytes; write it through the workbench files API"}
  def cap_write(_), do: {:error, "content is required"}

  defp sandbox("/workbench" <> _ = path), do: path
  defp sandbox("/" <> _ = path), do: Mount.virtual(path)
  defp sandbox(path) when is_binary(path), do: path

  defp render_entry(%{path: path, kind: kind}), do: "#{Mount.virtual(path)} #{kind}"

  defp render_grep_match(%{path: path, line_number: n, line: line} = match) do
    virtual = Mount.virtual(path)
    [
      grep_context(virtual, match[:before]),
      ["#{virtual}:#{n}:#{line}"],
      grep_context(virtual, match[:after])
    ]
    |> List.flatten()
    |> Enum.join("\n")
  end

  defp grep_context(_path, lines) when lines in [nil, []], do: []
  defp grep_context(path, lines) do
    Enum.map(lines, fn %{line_number: n, text: text} -> "#{path}-#{n}-#{text}" end)
  end

  defp body(_, %{kind: :directory}, _), do: {:error, "cannot read a directory"}
  defp body(%Workbench{id: id} = bench, %{kind: :file, size: size, path: path} = file, %User{} = user)
       when is_integer(size) do
    case size > Output.max_bytes() do
      true -> {:ok, {:download, WorkbenchFiles.download_url(id, path, user), size}}
      false -> read_body(bench, file, user)
    end
  end
  defp body(%Workbench{} = bench, %{} = file, %User{} = user), do: read_body(bench, file, user)

  defp read_body(%Workbench{id: id} = bench, %{path: path} = file, %User{} = user) do
    case WorkbenchFiles.read_text(bench, path) do
      {:ok, text} -> {:ok, {:text, text}}
      {:error, "invalid UTF-8" <> _} -> {:ok, {:download, WorkbenchFiles.download_url(id, file.path, user), file.size}}
      {:error, msg} -> {:error, msg}
    end
  end
end
