defmodule Console.PseudoFS do
  @moduledoc """
  Client for the workbench filesystem, a pseudofs gRPC server deployed alongside the console
  when an object store is configured.  Every workbench is a separate tenant, keyed by its id,
  and all paths are absolute within that tenant.
  """
  alias Console.PseudoFS.Client
  alias Pseudofs.V1.PseudoFS.Stub
  alias Pseudofs.V1.{
    PathRequest,
    BoolResponse,
    TextResponse,
    BytesResponse,
    WriteTextRequest,
    WriteBytesRequest,
    WriteResponse,
    OpenRequest,
    FileHandle,
    MkdirRequest,
    MutationPathRequest,
    RenameRequest,
    PathResponse,
    StatResponse,
    DirectoryEntry,
    StreamFileRequest,
    FileChunk,
    WriteFileRequest,
    WriteFileStart,
    GlobRequest,
    GrepRequest,
    GrepMatch
  }

  @type tenant :: binary
  @type error :: {:error, GRPC.RPCError.t | term}
  @type entry :: %{path: binary, name: binary, kind: :file | :directory}

  @chunk_size 1024 * 1024

  @doc "whether a pseudofs server has been configured for this console"
  @spec enabled?() :: boolean
  def enabled?(), do: is_binary(Console.conf(:pseudofs))

  @spec exists(tenant, binary) :: {:ok, boolean} | error
  def exists(tenant, path), do: bool(&Stub.exists/3, tenant, path)

  @spec file?(tenant, binary) :: {:ok, boolean} | error
  def file?(tenant, path), do: bool(&Stub.is_file/3, tenant, path)

  @spec dir?(tenant, binary) :: {:ok, boolean} | error
  def dir?(tenant, path), do: bool(&Stub.is_dir/3, tenant, path)

  @spec read_text(tenant, binary) :: {:ok, binary} | error
  def read_text(tenant, path) do
    with {:ok, %TextResponse{value: value}} <- unary(&Stub.read_text/3, %PathRequest{tenant: tenant, path: path}),
      do: {:ok, value}
  end

  @spec read_bytes(tenant, binary) :: {:ok, binary} | error
  def read_bytes(tenant, path) do
    with {:ok, %BytesResponse{value: value}} <- unary(&Stub.read_bytes/3, %PathRequest{tenant: tenant, path: path}),
      do: {:ok, value}
  end

  @spec write_text(tenant, binary, binary) :: {:ok, non_neg_integer} | error
  def write_text(tenant, path, value),
    do: write(&Stub.write_text/3, %WriteTextRequest{tenant: tenant, path: path, value: value})

  @spec write_bytes(tenant, binary, binary) :: {:ok, non_neg_integer} | error
  def write_bytes(tenant, path, value),
    do: write(&Stub.write_bytes/3, %WriteBytesRequest{tenant: tenant, path: path, value: value})

  @spec append_text(tenant, binary, binary) :: {:ok, non_neg_integer} | error
  def append_text(tenant, path, value),
    do: write(&Stub.append_text/3, %WriteTextRequest{tenant: tenant, path: path, value: value})

  @spec append_bytes(tenant, binary, binary) :: {:ok, non_neg_integer} | error
  def append_bytes(tenant, path, value),
    do: write(&Stub.append_bytes/3, %WriteBytesRequest{tenant: tenant, path: path, value: value})

  @doc "opens a file with a python mode string, truncating for `w` and creating for `a`"
  @spec open(tenant, binary, binary) :: {:ok, FileHandle.t} | error
  def open(tenant, path, mode), do: unary(&Stub.open/3, %OpenRequest{tenant: tenant, path: path, mode: mode})

  @spec mkdir(tenant, binary, keyword) :: :ok | error
  def mkdir(tenant, path, opts \\ []) do
    req = %MkdirRequest{
      tenant: tenant,
      path: path,
      parents: Keyword.get(opts, :parents, false),
      exist_ok: Keyword.get(opts, :exist_ok, false)
    }

    ok(unary(&Stub.mkdir/3, req))
  end

  @spec unlink(tenant, binary) :: :ok | error
  def unlink(tenant, path),
    do: ok(unary(&Stub.unlink/3, %MutationPathRequest{tenant: tenant, path: path}))

  @spec rmdir(tenant, binary) :: :ok | error
  def rmdir(tenant, path),
    do: ok(unary(&Stub.rmdir/3, %MutationPathRequest{tenant: tenant, path: path}))

  @doc "renames a file or directory, returning the new path"
  @spec rename(tenant, binary, binary) :: {:ok, binary} | error
  def rename(tenant, source, target) do
    with {:ok, %PathResponse{path: path}} <- unary(&Stub.rename/3, %RenameRequest{tenant: tenant, source: source, target: target}),
      do: {:ok, path}
  end

  @spec stat(tenant, binary) :: {:ok, StatResponse.t} | error
  def stat(tenant, path), do: unary(&Stub.stat/3, %PathRequest{tenant: tenant, path: path})

  @doc "lists the direct children of a directory"
  @spec iterdir(tenant, binary) :: {:ok, [entry]} | error
  def iterdir(tenant, path),
    do: collect(&Stub.iterdir/3, %PathRequest{tenant: tenant, path: path}, &entry/1)

  @doc "matches an absolute glob pattern (supporting `**` and `{a,b}`) against the tenant's files"
  @spec glob(tenant, binary, non_neg_integer) :: {:ok, [entry]} | error
  def glob(tenant, pattern, max_results \\ 0),
    do: collect(&Stub.glob/3, %GlobRequest{tenant: tenant, pattern: pattern, max_results: max_results}, &entry/1)

  @doc """
  Searches a file, a directory (recursively) or glob pattern for a regex.  Supports the options
  `fixed_string`, `case_insensitive`, `before_context`, `after_context`, `max_matches` and `max_file_size_bytes`.
  """
  @spec grep(tenant, binary, binary, keyword) :: {:ok, [map]} | error
  def grep(tenant, path, pattern, opts \\ []) do
    req = struct(GrepRequest, Keyword.merge(opts, tenant: tenant, path: path, pattern: pattern))
    collect(&Stub.grep/3, req, &grep_match/1)
  end

  @doc """
  Streams a file's contents in chunks, optionally starting at `offset` and reading at most `length` bytes.
  """
  @spec stream_file(tenant, binary, non_neg_integer, non_neg_integer | nil) :: {:ok, Enumerable.t} | error
  def stream_file(tenant, path, offset \\ 0, length \\ nil) do
    with {:ok, channel} <- Client.connect(),
         {:ok, stream} <- Stub.stream_file(channel, %StreamFileRequest{tenant: tenant, path: path, offset: offset, length: length}, Client.stream_opts()) do
      {:ok, Stream.map(stream, fn
        {:ok, %FileChunk{data: data}} -> data
        {:error, err} -> raise err
      end)}
    end
  end

  @doc "writes a file from an enumerable of binaries, chunking through the streaming rpc so size isn't bounded by unary limits"
  @spec write_file(tenant, binary, Enumerable.t) :: {:ok, non_neg_integer} | error
  def write_file(tenant, path, chunks) do
    with {:ok, channel} <- Client.connect() do
      stream = Stub.write_file(channel, Client.stream_opts())
      stream = GRPC.Stub.send_request(stream, %WriteFileRequest{payload: {:start, %WriteFileStart{tenant: tenant, path: path}}})

      chunks
      |> Stream.flat_map(&rechunk/1)
      |> Enum.reduce(stream, &GRPC.Stub.send_request(&2, %WriteFileRequest{payload: {:chunk, &1}}))
      |> GRPC.Stub.end_stream()
      |> GRPC.Stub.recv(Client.stream_opts())
      |> case do
        {:ok, %WriteResponse{size: size}} -> {:ok, size}
        err -> err
      end
    end
  end

  @doc "writes a local file into the filesystem in chunks"
  @spec upload(tenant, binary, binary) :: {:ok, non_neg_integer} | error
  def upload(tenant, path, local_path),
    do: write_file(tenant, path, File.stream!(local_path, @chunk_size))

  @doc "deletes a file or directory tree"
  @spec delete(tenant, binary) :: :ok | error
  def delete(tenant, path) do
    with {:ok, %StatResponse{kind: kind}} <- stat(tenant, path),
      do: delete(tenant, path, kind)
  end

  defp delete(tenant, path, :DIRECTORY) do
    with {:ok, entries} <- iterdir(tenant, path),
         :ok <- delete_all(tenant, entries),
      do: rmdir(tenant, path)
  end
  defp delete(tenant, path, _), do: unlink(tenant, path)

  defp delete_all(tenant, entries) do
    Enum.reduce_while(entries, :ok, fn %{path: path}, :ok ->
      case delete(tenant, path) do
        :ok -> {:cont, :ok}
        err -> {:halt, err}
      end
    end)
  end

  @doc """
  Classifies a pseudofs error.  The server attaches a raw `ErrorDetail` that the elixir grpc client can't
  decode (it expects a `google.rpc.Status`), so this falls back to the status code and message.
  """
  @spec error_kind(term) :: atom
  def error_kind(%GRPC.RPCError{status: 5}), do: :not_found
  def error_kind(%GRPC.RPCError{status: 6}), do: :already_exists
  def error_kind(%GRPC.RPCError{status: 9, message: "not a directory" <> _}), do: :not_directory
  def error_kind(%GRPC.RPCError{status: 9, message: "is a directory" <> _}), do: :is_directory
  def error_kind(%GRPC.RPCError{status: 9, message: "directory not empty" <> _}), do: :directory_not_empty
  def error_kind(%GRPC.RPCError{status: 3}), do: :invalid_argument
  def error_kind(%GRPC.RPCError{status: 7}), do: :root_operation
  def error_kind(%GRPC.RPCError{status: 8}), do: :resource_exhausted
  def error_kind(%GRPC.RPCError{status: 10}), do: :conflict
  def error_kind(%GRPC.RPCError{status: 15, message: "invalid UTF-8" <> _}), do: :invalid_utf8
  def error_kind(_), do: :internal

  @spec error_message(term) :: binary
  def error_message(%GRPC.RPCError{message: msg}) when is_binary(msg), do: msg
  def error_message(err) when is_binary(err), do: err
  def error_message(err), do: inspect(err)

  @doc "the kind of a pseudofs entry as an atom"
  @spec kind(atom | integer) :: :file | :directory | nil
  def kind(:FILE), do: :file
  def kind(:DIRECTORY), do: :directory
  def kind(1), do: :file
  def kind(2), do: :directory
  def kind(_), do: nil

  defp entry(%DirectoryEntry{path: path, name: name, kind: kind}), do: %{path: path, name: name, kind: kind(kind)}

  defp grep_match(%GrepMatch{} = match) do
    %{
      path: match.path,
      line_number: match.line_number,
      line: match.line,
      before: Enum.map(match.before, &Map.take(&1, [:line_number, :text])),
      after: Enum.map(match.after, &Map.take(&1, [:line_number, :text]))
    }
  end

  defp rechunk(data) when byte_size(data) > @chunk_size do
    <<chunk::binary-size(@chunk_size), rest::binary>> = data
    [chunk | rechunk(rest)]
  end
  defp rechunk(data), do: [data]

  defp bool(fun, tenant, path) do
    with {:ok, %BoolResponse{value: value}} <- unary(fun, %PathRequest{tenant: tenant, path: path}),
      do: {:ok, value}
  end

  defp write(fun, req) do
    with {:ok, %WriteResponse{size: size}} <- unary(fun, req),
      do: {:ok, size}
  end

  defp unary(fun, req) do
    with {:ok, channel} <- Client.connect(),
      do: fun.(channel, req, Client.rpc_opts())
  end

  defp collect(fun, req, mapper) do
    with {:ok, channel} <- Client.connect(),
         {:ok, stream} <- fun.(channel, req, Client.stream_opts()) do
      Enum.reduce_while(stream, {:ok, []}, fn
        {:ok, item}, {:ok, acc} -> {:cont, {:ok, [mapper.(item) | acc]}}
        {:error, _} = err, _ -> {:halt, err}
        _, acc -> {:cont, acc}
      end)
      |> case do
        {:ok, items} -> {:ok, Enum.reverse(items)}
        err -> err
      end
    end
  end

  defp ok({:ok, _}), do: :ok
  defp ok({:error, _} = err), do: err
end
