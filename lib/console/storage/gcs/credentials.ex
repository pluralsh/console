defmodule Console.Storage.GCS.Credentials do
  @moduledoc """
  Credentials for Google Cloud Storage.

  A service account JSON key in `CONSOLE_GCS_CREDENTIALS` is exchanged for an access token and used to sign
  urls locally. Without it, tokens come from the GKE metadata server and urls are signed with the IAM
  `signBlob` API, which the identity needs `iam.serviceAccounts.signBlob` on itself to call.
  """
  alias Console.Cache

  @storage_scope "https://www.googleapis.com/auth/devstorage.read_write"
  @iam_scope "https://www.googleapis.com/auth/iam"
  @jwt_scope @storage_scope <> " " <> @iam_scope
  @metadata_scopes @storage_scope <> "," <> @iam_scope
  @token_url "https://oauth2.googleapis.com/token"
  @metadata_url "http://metadata.google.internal"
  @iam_url "https://iamcredentials.googleapis.com"

  @doc """
  An access token for the storage and IAM audiences, cached until shortly before it expires.
  """
  @spec token() :: {:ok, binary} | Console.error
  def token() do
    with {:ok, source} <- source() do
      case Cache.get({:gcs_storage_token, cache_key(source)}) do
        token when is_binary(token) -> {:ok, token}
        _ ->
          with {:ok, token, expires_in} <- fetch_token(source) do
            Cache.put({:gcs_storage_token, cache_key(source)}, token, ttl: :timer.seconds(max(expires_in - 300, 60)))
            {:ok, token}
          end
      end
    end
  end

  @doc """
  The service account email that signs download urls.
  """
  @spec email() :: {:ok, binary} | Console.error
  def email() do
    case source() do
      {:ok, {:key, %{email: email}}} -> {:ok, email}
      {:ok, :metadata} -> metadata_email()
      {:error, _} = err -> err
    end
  end

  @doc """
  Hex-encoded RSA-SHA256 signature of `payload`.
  """
  @spec sign(binary) :: {:ok, binary} | Console.error
  def sign(payload) when is_binary(payload) do
    case source() do
      {:ok, {:key, %{private_key: pem}}} -> {:ok, sign_local(payload, pem)}
      {:ok, :metadata} ->
        with {:ok, token} <- token(),
             {:ok, email} <- email(),
             do: sign_blob(email, token, payload)
      {:error, _} = err -> err
    end
  end

  @doc """
  Signs `payload` with a PEM private key. Used by tests that pin the signed url to a known key.
  """
  @spec sign_local(binary, binary) :: binary
  def sign_local(payload, pem) when is_binary(payload) and is_binary(pem) do
    [entry] = :public_key.pem_decode(pem)
    :public_key.sign(payload, :sha256, :public_key.pem_entry_decode(entry))
    |> Base.encode16(case: :lower)
  end

  def req(opts \\ []) do
    Application.get_env(:console, Console.Storage.GCS, [])
    |> Keyword.take([:plug, :retry])
    |> Keyword.merge(opts)
    |> Keyword.put_new(:retry, :transient)
    |> Req.new()
  end

  def conf(key, default) do
    Application.get_env(:console, Console.Storage.GCS, [])
    |> Keyword.get(key, default)
  end

  defp fetch_token({:key, account}), do: exchange(account)
  defp fetch_token(:metadata), do: metadata_token()

  defp exchange(%{email: email, private_key: pem}) do
    url = token_url()
    assertion = jwt(email, pem, url)

    req()
    |> Req.post(url: url, form: %{
      "grant_type" => "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "assertion" => assertion
    })
    |> case do
      {:ok, %Req.Response{status: 200, body: body}} -> token_from(body)
      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, "gcs token exchange failed with status #{status}: #{inspect(body)}"}
      {:error, err} ->
        {:error, "gcs token exchange failed: #{inspect(err)}"}
    end
  end

  defp metadata_token() do
    req()
    |> Req.get(
      url: metadata_url() <> "/computeMetadata/v1/instance/service-accounts/default/token",
      params: [scopes: @metadata_scopes],
      headers: [{"metadata-flavor", "Google"}]
    )
    |> case do
      {:ok, %Req.Response{status: 200, body: body}} -> token_from(body)
      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, "gcs workload identity metadata request failed with status #{status}: #{inspect(body)}, set CONSOLE_GCS_CREDENTIALS or run with workload identity"}
      {:error, err} ->
        {:error, "gcs workload identity is unavailable (#{inspect(err)}), set CONSOLE_GCS_CREDENTIALS or run with workload identity"}
    end
  end

  defp metadata_email() do
    req()
    |> Req.get(
      url: metadata_url() <> "/computeMetadata/v1/instance/service-accounts/default/email",
      headers: [{"metadata-flavor", "Google"}]
    )
    |> case do
      {:ok, %Req.Response{status: 200, body: email}} when is_binary(email) -> {:ok, String.trim(email)}
      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, "gcs workload identity email request failed with status #{status}: #{inspect(body)}"}
      {:error, err} ->
        {:error, "gcs workload identity email request failed: #{inspect(err)}"}
    end
  end

  defp sign_blob(email, token, payload) do
    url = iam_url() <> "/v1/projects/-/serviceAccounts/" <> uri_encode(email) <> ":signBlob"

    req(auth: {:bearer, token})
    |> Req.post(url: url, json: %{payload: Base.encode64(payload)})
    |> case do
      {:ok, %Req.Response{status: 200, body: %{"signedBlob" => blob}}} ->
        {:ok, blob |> Base.decode64!() |> Base.encode16(case: :lower)}
      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, "gcs signBlob failed with status #{status}: #{inspect(body)}"}
      {:error, err} ->
        {:error, "gcs signBlob failed: #{inspect(err)}"}
    end
  end

  defp jwt(email, pem, aud) do
    now = System.os_time(:second)
    header = url_encode64(%{alg: "RS256", typ: "JWT"})
    claims = url_encode64(%{iss: email, scope: @jwt_scope, aud: aud, iat: now, exp: now + 3600})
    signing_input = header <> "." <> claims
    signature = sign_local(signing_input, pem) |> Base.decode16!(case: :lower) |> Base.url_encode64(padding: false)
    signing_input <> "." <> signature
  end

  defp url_encode64(map) do
    map |> Jason.encode!() |> Base.url_encode64(padding: false)
  end

  defp token_from(%{"access_token" => token} = body) when is_binary(token),
    do: {:ok, token, to_int(body["expires_in"] || 3600)}
  defp token_from(body),
    do: {:error, "gcs token response did not include an access token: #{inspect(body)}"}

  defp source() do
    case System.get_env("CONSOLE_GCS_CREDENTIALS") do
      json when is_binary(json) and byte_size(json) > 0 ->
        case Jason.decode(json) do
          {:ok, %{"client_email" => email, "private_key" => key}} when is_binary(email) and is_binary(key) ->
            {:ok, {:key, %{email: email, private_key: key}}}
          _ ->
            {:error, "CONSOLE_GCS_CREDENTIALS is not valid service account json"}
        end
      _ ->
        {:ok, :metadata}
    end
  end

  defp cache_key({:key, %{email: email}}), do: {:key, email}
  defp cache_key(:metadata), do: :metadata

  defp token_url(), do: conf(:token_url, @token_url) |> String.trim_trailing("/")
  defp metadata_url(), do: conf(:metadata_url, @metadata_url) |> String.trim_trailing("/")
  defp iam_url(), do: conf(:iam_url, @iam_url) |> String.trim_trailing("/")

  defp uri_encode(value), do: URI.encode(to_string(value), &URI.char_unreserved?/1)

  defp to_int(v) when is_integer(v), do: v
  defp to_int(v) when is_binary(v), do: String.to_integer(v)
end
