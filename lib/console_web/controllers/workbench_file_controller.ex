defmodule ConsoleWeb.WorkbenchFileController do
  use ConsoleWeb, :controller
  alias Console.PseudoFS
  alias Console.Services.Users
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.User

  @doc """
  Downloads a file from a workbench's filesystem, either with a pre-signed `token` or the usual
  authorization header alongside `id` and `path` params.  Supports single byte-range requests so
  media can be streamed and seeked.  Pass `download=true` to force an attachment disposition.
  """
  def download(conn, params) do
    with {:ok, id, path, user} <- authorize(conn, params),
         {:ok, bench} <- WorkbenchFiles.authorize(id, user, :read),
         {:ok, %{kind: :file, size: size} = file} <- WorkbenchFiles.stat(bench, path) do
      {mime, disposition} = presentation(params, file.name)

      conn
      |> put_resp_header("accept-ranges", "bytes")
      |> put_resp_header("cache-control", "private, max-age=0")
      |> put_resp_header("x-content-type-options", "nosniff")
      |> put_resp_content_type(mime, if(mime == "text/plain", do: "utf-8"))
      |> put_resp_header("content-disposition", "#{disposition}; #{filename(file.name)}")
      |> respond(id, file.path, size, range(conn, size))
    else
      {:ok, %{kind: :directory}} -> send_resp(conn, 400, "cannot download a directory")
      {:error, :unauthorized} -> send_resp(conn, 401, "Unauthorized")
      {:error, "workbench not found"} -> send_resp(conn, 404, "Not Found")
      {:error, "no such file" <> _} -> send_resp(conn, 404, "Not Found")
      {:error, msg} when is_binary(msg) -> send_resp(conn, 403, msg)
      _ -> send_resp(conn, 403, "Forbidden")
    end
  end

  defp respond(conn, _, _, size, :unsatisfiable) do
    conn
    |> put_resp_header("content-range", "bytes */#{size}")
    |> send_resp(416, "")
  end

  defp respond(conn, id, path, size, {first, last}) do
    conn
    |> put_resp_header("content-range", "bytes #{first}-#{last}/#{size}")
    |> stream(206, id, path, first, last - first + 1)
  end

  defp respond(conn, id, path, size, :full), do: stream(conn, 200, id, path, 0, size)

  defp stream(conn, status, _, _, _, 0) do
    conn
    |> put_resp_header("content-length", "0")
    |> send_resp(status, "")
  end

  defp stream(conn, status, id, path, offset, length) do
    case PseudoFS.stream_file(id, path, offset, length) do
      {:ok, chunks} ->
        conn = conn
               |> put_resp_header("content-length", "#{length}")
               |> send_chunked(status)

        Enum.reduce_while(chunks, conn, fn data, conn ->
          case chunk(conn, data) do
            {:ok, conn} -> {:cont, conn}
            {:error, :closed} -> {:halt, conn}
          end
        end)
      {:error, err} -> send_resp(conn, 500, PseudoFS.error_message(err))
    end
  end

  @doc false
  def range(conn, size) do
    case get_req_header(conn, "range") do
      ["bytes=" <> spec | _] -> parse_range(String.trim(spec), size)
      _ -> :full
    end
  end

  # multi-range and malformed headers are ignored, per RFC 9110
  defp parse_range(spec, size) do
    case Enum.map(String.split(spec, "-", parts: 2), &parse_int/1) do
      [:empty, n] when is_integer(n) and n > 0 -> bounded(max(size - n, 0), size - 1, size)
      [:empty, 0] -> :unsatisfiable
      [f, :empty] when is_integer(f) -> bounded(f, size - 1, size)
      [f, l] when is_integer(f) and is_integer(l) and l >= f -> bounded(f, min(l, size - 1), size)
      _ -> :full
    end
  end

  defp parse_int(""), do: :empty
  defp parse_int(val) do
    case Integer.parse(val) do
      {n, ""} when n >= 0 -> n
      _ -> :invalid
    end
  end

  defp bounded(first, last, size) when first >= 0 and first < size and last >= first, do: {first, last}
  defp bounded(_, _, _), do: :unsatisfiable

  defp authorize(_conn, %{"token" => token}) do
    with {:ok, {id, path, user_id}} <- WorkbenchFiles.verify_download_token(token),
         %User{} = user <- Users.get_user(user_id) do
      {:ok, id, path, Console.Services.Rbac.preload(user)}
    else
      _ -> {:error, :unauthorized}
    end
  end

  defp authorize(conn, %{"id" => id, "path" => path}) do
    case Guardian.Plug.current_resource(conn) do
      %User{} = user -> {:ok, id, path, user}
      _ -> {:error, :unauthorized}
    end
  end

  defp authorize(_, _), do: {:error, "a token, or an id and path are required"}

  # files are agent or user authored and served from the console's origin, so only types browsers
  # can't execute script from are rendered inline (eg html or svg would otherwise be stored xss).
  # Data formats like yaml, json and csv are relabelled as plain text so browsers display them.
  defp presentation(%{"download" => "true"}, name), do: {MIME.from_path(name), "attachment"}
  defp presentation(_, name) do
    mime = MIME.from_path(name)
    cond do
      inline_safe?(mime) -> {mime, "inline"}
      plain_text?(mime, name) -> {"text/plain", "inline"}
      true -> {mime, "attachment"}
    end
  end

  defp inline_safe?("image/svg+xml"), do: false
  defp inline_safe?("image/" <> _), do: true
  defp inline_safe?("video/" <> _), do: true
  defp inline_safe?("audio/" <> _), do: true
  defp inline_safe?("application/pdf"), do: true
  defp inline_safe?("text/plain"), do: true
  defp inline_safe?(_), do: false

  @plain_text_types ~w(application/json text/csv text/markdown text/xml application/xml)
  @plain_text_extensions ~w(.yaml .yml .jsonl .ndjson .tsv .log .toml .tf .hcl .ini .conf .env .tpl)

  defp plain_text?(mime, _) when mime in @plain_text_types, do: true
  defp plain_text?(_, name), do: String.downcase(Path.extname(name)) in @plain_text_extensions

  defp filename(name) do
    ascii = String.replace(name, ~r/[^\x20-\x7E]|["\\]/, "_")
    "filename=\"#{ascii}\"; filename*=UTF-8''#{URI.encode(name, &URI.char_unreserved?/1)}"
  end
end
