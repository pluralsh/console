defmodule Console.Storage.Azure do
  @moduledoc """
  Waffle storage for Azure Blob Storage authenticated with workload identity instead of a shared account key.
  Signed urls are user delegation SAS urls, which the identity needs `Storage Blob Delegator` (or any blob data
  role, eg `Storage Blob Data Contributor`) on the account to issue.
  """
  @behaviour Waffle.StorageBehavior
  require Logger
  alias Waffle.Definition.Versioning
  alias Console.Storage.Azure.Credentials
  alias Console.Storage.Azure.Credentials.DelegationKey

  @default_expiry 60 * 60

  @impl true
  def put(definition, version, {file, scope}) do
    {account, container, blob} = location(definition, version, {file, scope})
    headers =
      definition.azure_blob_headers(version, {file, scope})
      |> Enum.map(fn {k, v} -> {to_string(k), to_string(v)} end)

    with {:ok, body} <- contents(file),
         {:ok, token} <- Credentials.token() do
      Credentials.req(base_url: Credentials.endpoint(account), auth: {:bearer, token})
      |> Req.put(
        url: blob_path(container, blob),
        body: body,
        headers: [
          {"x-ms-blob-type", "BlockBlob"},
          {"content-type", MIME.from_path(file.file_name)} | headers
        ]
      )
      |> case do
        {:ok, %Req.Response{status: 201}} -> {:ok, file.file_name}
        {:ok, %Req.Response{status: status, body: body}} ->
          Logger.error("[Console.Storage.Azure] upload of #{blob} failed with status #{status}: #{inspect(body)}")
          {:error, "upload failed with status #{status}"}
        {:error, err} -> {:error, "upload failed: #{inspect(err)}"}
      end
    end
  end

  @impl true
  def url(definition, version, file_and_scope, opts \\ []) do
    {account, container, blob} = location(definition, version, file_and_scope)
    url = Credentials.endpoint(account) <> blob_path(container, blob)

    with true <- Keyword.get(opts, :signed, false),
         {:ok, key} <- Credentials.delegation_key(account) do
      "#{url}?#{sas(account, container, blob, key, Keyword.get(opts, :expires_in, @default_expiry))}"
    else
      false -> url
      {:error, err} ->
        Logger.error("[Console.Storage.Azure] failed to sign url for #{blob}: #{err}")
        url
    end
  end

  @impl true
  def delete(definition, version, file_and_scope) do
    {account, container, blob} = location(definition, version, file_and_scope)

    with {:ok, token} <- Credentials.token(),
         {:ok, %Req.Response{status: status}} when status in [202, 404] <-
           Credentials.req(base_url: Credentials.endpoint(account), auth: {:bearer, token})
           |> Req.delete(url: blob_path(container, blob)) do
      :ok
    else
      _ -> :error
    end
  end

  @doc """
  A read-only user delegation SAS query string for a single blob.
  """
  @spec sas(binary, binary, binary, DelegationKey.t, integer, DateTime.t) :: binary
  def sas(account, container, blob, %DelegationKey{} = key, expires_in, now \\ DateTime.utc_now()) do
    start = Credentials.timestamp(DateTime.add(now, -300))
    expiry = Credentials.timestamp(DateTime.add(now, expires_in))
    version = Credentials.version()

    signature =
      [
        "r", start, expiry, "/blob/#{account}/#{container}/#{blob}",
        key.oid, key.tid, key.start, key.expiry, key.service, key.version,
        "", "", "", # authorized oid, unauthorized oid, correlation id
        "",         # ip
        "https", version, "b",
        "", "",     # snapshot time, encryption scope
        "", "", "", "", "" # rscc, rscd, rsce, rscl, rsct
      ]
      |> Enum.join("\n")
      |> then(&:crypto.mac(:hmac, :sha256, Base.decode64!(key.value), &1))
      |> Base.encode64()

    URI.encode_query([
      sv: version, st: start, se: expiry, sr: "b", sp: "r", spr: "https",
      skoid: key.oid, sktid: key.tid, skt: key.start, ske: key.expiry, sks: key.service, skv: key.version,
      sig: signature
    ])
  end

  defp location(definition, version, file_and_scope) do
    blob = Path.join(
      definition.storage_dir(version, file_and_scope),
      Versioning.resolve_file_name(definition, version, file_and_scope)
    )
    {config(definition.storage_account(file_and_scope)), config(definition.container(file_and_scope)), blob}
  end

  defp blob_path(container, blob), do: "/#{container}/#{URI.encode(blob)}"

  defp contents(%Waffle.File{binary: binary}) when is_binary(binary), do: {:ok, binary}
  defp contents(%Waffle.File{stream: stream}) when is_struct(stream), do: {:ok, Enum.into(stream, <<>>)}
  defp contents(%Waffle.File{path: path}) do
    case File.read(path) do
      {:ok, binary} -> {:ok, binary}
      {:error, reason} -> {:error, "could not read #{path}: #{:file.format_error(reason)}"}
    end
  end

  defp config({:system, var}), do: System.get_env(var)
  defp config(val), do: val
end
