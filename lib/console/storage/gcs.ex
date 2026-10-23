defmodule Console.Storage.GCS do
  @moduledoc """
  Waffle storage for Google Cloud Storage.

  Uploads and deletes use the JSON API. Signed download urls are V4 signatures. A service account JSON key in
  `CONSOLE_GCS_CREDENTIALS` signs them locally. Without a key, the GKE metadata server supplies the token and the
  IAM `signBlob` API signs the url. That identity needs object create and delete on the bucket
  (`roles/storage.objectAdmin` covers both) and `roles/iam.serviceAccountTokenCreator` on itself.
  """
  @behaviour Waffle.StorageBehavior
  require Logger
  alias Waffle.Definition.Versioning
  alias Console.Storage.GCS.Credentials

  @default_expiry 60 * 60
  @storage_url "https://storage.googleapis.com"

  @impl true
  def put(definition, version, {file, scope}) do
    bucket = bucket(definition, {file, scope})
    object = object(definition, version, {file, scope})

    with {:ok, body} <- contents(file),
         {:ok, token} <- Credentials.token() do
      Credentials.req(auth: {:bearer, token})
      |> Req.post(
        url: storage_url() <> "/upload/storage/v1/b/#{uri_encode(bucket)}/o",
        params: [uploadType: "media", name: object],
        body: body,
        headers: [{"content-type", MIME.from_path(file.file_name)}]
      )
      |> case do
        {:ok, %Req.Response{status: status}} when status in [200, 201] -> {:ok, file.file_name}
        {:ok, %Req.Response{status: status, body: resp}} ->
          Logger.error("[Console.Storage.GCS] upload of #{object} failed with status #{status}: #{inspect(resp)}")
          {:error, "upload failed with status #{status}"}
        {:error, err} -> {:error, "upload failed: #{inspect(err)}"}
      end
    end
  end

  @impl true
  def url(definition, version, file_and_scope, opts \\ []) do
    bucket = bucket(definition, file_and_scope)
    object = object(definition, version, file_and_scope)
    base = object_url(bucket, object)

    with true <- Keyword.get(opts, :signed, false),
         {:ok, email} <- Credentials.email(),
         {:ok, query} <- signed_query(bucket, object, email, Keyword.get(opts, :expires_in, @default_expiry)) do
      base <> "?" <> query
    else
      false -> base
      {:error, err} ->
        Logger.error("[Console.Storage.GCS] failed to sign url for #{object}: #{err}")
        base
    end
  end

  @impl true
  def delete(definition, version, file_and_scope) do
    bucket = bucket(definition, file_and_scope)
    object = object(definition, version, file_and_scope)

    with {:ok, token} <- Credentials.token(),
         {:ok, %Req.Response{status: status}} when status in [200, 204, 404] <-
           Credentials.req(auth: {:bearer, token})
           |> Req.delete(url: storage_url() <> "/storage/v1/b/#{uri_encode(bucket)}/o/#{uri_encode(object)}") do
      :ok
    else
      _ -> :error
    end
  end

  @doc """
  A V4 signed GET query string for one object, signed with `private_key`.

  `now` is pinned by tests. `host` is the host header covered by the signature.
  """
  @spec signed_query(binary, binary, binary, binary, integer, DateTime.t, binary) :: binary
  def signed_query(bucket, object, email, private_key, expires_in, %DateTime{} = now, host \\ "storage.googleapis.com") do
    params = signature_params(email, expires_in, now)
    string = string_to_sign(bucket, object, params, now, host)
    query_string(params, Credentials.sign_local(string, private_key))
  end

  defp signed_query(bucket, object, email, expires_in) do
    now = DateTime.utc_now()
    params = signature_params(email, expires_in, now)
    string = string_to_sign(bucket, object, params, now, request_host())

    case Credentials.sign(string) do
      {:ok, signature} -> {:ok, query_string(params, signature)}
      {:error, _} = err -> err
    end
  end

  defp signature_params(email, expires_in, now) do
    scope = "#{goog_day(now)}/auto/storage/goog4_request"

    [
      {"X-Goog-Algorithm", "GOOG4-RSA-SHA256"},
      {"X-Goog-Credential", "#{email}/#{scope}"},
      {"X-Goog-Date", goog_date(now)},
      {"X-Goog-Expires", to_string(expires_in)},
      {"X-Goog-SignedHeaders", "host"}
    ]
  end

  defp string_to_sign(bucket, object, params, now, host) do
    canonical = Enum.join([
      "GET",
      canonical_uri(bucket, object),
      canonical_query(params),
      "host:#{host}\n",
      "host",
      "UNSIGNED-PAYLOAD"
    ], "\n")

    scope = "#{goog_day(now)}/auto/storage/goog4_request"
    hash = :crypto.hash(:sha256, canonical) |> Base.encode16(case: :lower)

    Enum.join(["GOOG4-RSA-SHA256", goog_date(now), scope, hash], "\n")
  end

  defp query_string(params, signature), do: canonical_query(params) <> "&X-Goog-Signature=" <> signature

  defp canonical_query(params) do
    params
    |> Enum.map(fn {k, v} -> uri_encode(k) <> "=" <> uri_encode(v) end)
    |> Enum.join("&")
  end

  defp canonical_uri(bucket, object) do
    "/" <> Enum.map_join([bucket | String.split(object, "/", trim: true)], "/", &uri_encode/1)
  end

  defp object_url(bucket, object), do: storage_url() <> canonical_uri(bucket, object)

  defp object(definition, version, file_and_scope) do
    Path.join(
      definition.storage_dir(version, file_and_scope),
      Versioning.resolve_file_name(definition, version, file_and_scope)
    )
  end

  defp bucket(definition, file_and_scope) do
    case definition.bucket(file_and_scope) do
      {:system, var} -> System.get_env(var)
      val -> val
    end
  end

  defp contents(%Waffle.File{binary: binary}) when is_binary(binary), do: {:ok, binary}
  defp contents(%Waffle.File{stream: stream}) when is_struct(stream), do: {:ok, Enum.into(stream, <<>>)}
  defp contents(%Waffle.File{path: path}) do
    case File.read(path) do
      {:ok, binary} -> {:ok, binary}
      {:error, reason} -> {:error, "could not read #{path}: #{:file.format_error(reason)}"}
    end
  end

  defp storage_url(), do: Credentials.conf(:storage_url, @storage_url) |> String.trim_trailing("/")

  defp request_host() do
    %URI{host: host, port: port, scheme: scheme} = URI.parse(storage_url())

    cond do
      is_nil(port) -> host
      scheme == "https" and port == 443 -> host
      scheme == "http" and port == 80 -> host
      true -> "#{host}:#{port}"
    end
  end

  defp goog_date(%DateTime{} = dt), do: Calendar.strftime(dt, "%Y%m%dT%H%M%SZ")
  defp goog_day(%DateTime{} = dt), do: Calendar.strftime(dt, "%Y%m%d")

  defp uri_encode(value), do: URI.encode(to_string(value), &URI.char_unreserved?/1)
end
