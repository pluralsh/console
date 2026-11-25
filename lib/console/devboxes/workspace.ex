defmodule Console.Devboxes.Workspace do
  @moduledoc """
  Live access to an instance's workspace through the gateway: terminal, vnc and preview streams, files and
  uncommitted changes.  Reads need read access to the instance's workbench, streams and writes need `:prompt`.
  """
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Devboxes
  alias Console.Devboxes.{Control, Error, StreamToken}
  alias Console.Schema.User

  @type error :: Console.error
  @kinds ~w(terminal vnc preview)a

  @doc """
  Opens a terminal (a new one unless `terminal_id` is given), vnc or preview (`port`) stream and mints its token.
  A vnc stream starts the instance's browser if needed and, given a `url`, opens it there.
  """
  @spec open_stream(binary, atom, map, User.t) :: {:ok, map} | error
  def open_stream(instance_id, kind, opts, %User{} = user) when kind in @kinds do
    with {:ok, inst} <- writable(instance_id, user),
         :ok <- validate_stream(kind, opts),
         {:ok, stream} <- Control.open_stream(inst, kind, Map.put(opts, :principal, principal(user))) |> Error.control_ok(),
         {:ok, token, exp} <- StreamToken.mint(inst, stream, user) do
      {:ok, %{
        stream_id: stream.stream_id,
        kind: kind,
        url: StreamToken.url(stream.stream_id),
        token: token,
        expires_at: exp,
        subprotocols: stream[:subprotocols] || [],
        terminal_id: terminal_id(stream, opts)
      }}
    end
  end
  def open_stream(_, kind, _, _), do: {:error, "unknown stream kind #{kind}"}

  defp validate_stream(:preview, %{port: port}) when is_integer(port) and port > 0 and port < 65_536, do: :ok
  defp validate_stream(:preview, _), do: {:error, "a preview stream needs a port between 1 and 65535"}
  defp validate_stream(:vnc, %{url: url}) when is_binary(url) do
    case URI.new(url) do
      {:ok, %URI{scheme: scheme, host: host}} when scheme in ~w(http https) and is_binary(host) and host != "" -> :ok
      _ -> {:error, "the browser can only open http(s) urls"}
    end
  end
  defp validate_stream(_, _), do: :ok

  defp terminal_id(%{terminal: %{terminal_id: id}}, _) when is_binary(id), do: id
  defp terminal_id(_, opts), do: opts[:terminal_id]

  @doc """
  One directory level of the workspace (`~` relative paths), or with a `:query` the best fuzzy matches anywhere
  beneath it.  `:brief` entries carry only path, name, type and repository, and are served from memory.
  """
  @spec list_files(binary, binary | nil, map, User.t) :: {:ok, [map]} | error
  def list_files(instance_id, path, opts, %User{} = user) do
    with {:ok, inst} <- readable(instance_id, user),
      do: Control.list_files(inst, path || "", Map.take(opts, [:query, :brief])) |> Error.control_ok()
  end

  @doc """
  A file's content.  Binary or truncated content is flagged, text is returned as is.
  """
  @spec read_file(binary, binary, User.t) :: {:ok, map} | error
  def read_file(instance_id, path, %User{} = user) do
    with {:ok, inst} <- readable(instance_id, user),
      do: Control.read_file(inst, path, %{}) |> Error.control_ok()
  end

  @doc """
  Writes a file.  With `expected_sha256` the write fails if the file changed since it was read.
  """
  @spec write_file(binary, binary, binary, binary | nil, User.t) :: {:ok, map} | error
  def write_file(instance_id, path, content, expected_sha256, %User{} = user) do
    with {:ok, inst} <- writable(instance_id, user),
      do: Control.write_file(inst, path, content, %{expected_sha256: expected_sha256, principal: principal(user)}) |> Error.control_ok()
  end

  @doc """
  Uncommitted changes, grouped by checkout.
  """
  @spec changes(binary, map, User.t) :: {:ok, [map]} | error
  def changes(instance_id, opts, %User{} = user) do
    with {:ok, inst} <- readable(instance_id, user),
      do: Control.get_changes(inst, opts) |> Error.control_ok()
  end

  defp readable(id, user) do
    Devboxes.get_instance!(id)
    |> Repo.preload([:devbox])
    |> allow(user, :read)
    |> when_ok(&Devboxes.ensure_live/1)
  end

  defp writable(id, user) do
    Devboxes.get_instance!(id)
    |> Repo.preload([:devbox])
    |> allow(user, :prompt)
    |> when_ok(&Devboxes.ensure_live/1)
  end

  defp principal(%User{id: id, email: email, name: name}), do: %{user_id: id, email: email, name: name}
end
