defmodule Console.Storage.Azure.Credentials do
  @moduledoc """
  Entra credentials for blob storage from AKS workload identity, using the `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`
  and `AZURE_FEDERATED_TOKEN_FILE` env vars injected by the workload identity webhook.
  """
  import SweetXml
  alias Console.Cache

  @scope "https://storage.azure.com/.default"
  @assertion_type "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
  @version "2020-12-06"
  @delegation_validity 24 * 60 * 60

  defmodule DelegationKey do
    @type t :: %__MODULE__{}
    defstruct [:oid, :tid, :start, :expiry, :service, :version, :value]
  end

  def version(), do: @version

  def endpoint(account), do: "https://#{account}.blob.core.windows.net"

  def req(opts) do
    Application.get_env(:console, Console.Storage.Azure, [])
    |> Keyword.merge(opts)
    |> Keyword.put_new(:retry, :transient)
    |> Req.new()
    |> Req.Request.put_header("x-ms-version", @version)
  end

  @doc """
  An access token for the storage audience, cached until shortly before it expires.
  """
  @spec token() :: {:ok, binary} | Console.error
  def token() do
    with nil <- Cache.get(:azure_storage_token),
         {:ok, token, expires_in} <- exchange() do
      Cache.put(:azure_storage_token, token, ttl: :timer.seconds(max(expires_in - 300, 60)))
      {:ok, token}
    else
      token when is_binary(token) -> {:ok, token}
      err -> err
    end
  end

  @doc """
  A user delegation key for signing SAS urls without an account key, rotated well before its expiry.
  """
  @spec delegation_key(binary) :: {:ok, DelegationKey.t} | Console.error
  def delegation_key(account) do
    key = {:azure_delegation_key, account}
    with nil <- Cache.get(key),
         {:ok, token} <- token(),
         {:ok, dk} <- fetch_delegation_key(account, token) do
      Cache.put(key, dk, ttl: :timer.seconds(div(@delegation_validity, 2)))
      {:ok, dk}
    else
      %DelegationKey{} = dk -> {:ok, dk}
      err -> err
    end
  end

  defp exchange() do
    with {:ok, tenant} <- env("AZURE_TENANT_ID"),
         {:ok, client} <- env("AZURE_CLIENT_ID"),
         {:ok, file} <- env("AZURE_FEDERATED_TOKEN_FILE"),
         {:ok, assertion} <- read_token(file) do
      req(base_url: authority())
      |> Req.post(url: "/#{tenant}/oauth2/v2.0/token", form: %{
        "client_id" => client,
        "scope" => @scope,
        "grant_type" => "client_credentials",
        "client_assertion_type" => @assertion_type,
        "client_assertion" => String.trim(assertion)
      })
      |> case do
        {:ok, %Req.Response{status: 200, body: %{"access_token" => token, "expires_in" => exp}}} ->
          {:ok, token, to_int(exp)}
        {:ok, %Req.Response{status: status, body: body}} ->
          {:error, "azure token exchange failed with status #{status}: #{inspect(body)}"}
        {:error, err} ->
          {:error, "azure token exchange failed: #{inspect(err)}"}
      end
    end
  end

  defp fetch_delegation_key(account, token) do
    now = DateTime.utc_now()
    body = """
    <?xml version="1.0" encoding="utf-8"?>
    <KeyInfo><Start>#{timestamp(DateTime.add(now, -300))}</Start><Expiry>#{timestamp(DateTime.add(now, @delegation_validity))}</Expiry></KeyInfo>
    """

    req(base_url: endpoint(account), auth: {:bearer, token})
    |> Req.post(url: "/", params: [restype: "service", comp: "userdelegationkey"], body: body, decode_body: false)
    |> case do
      {:ok, %Req.Response{status: 200, body: body}} ->
        {:ok, struct(DelegationKey, xmap(body,
          oid: ~x"//SignedOid/text()"s,
          tid: ~x"//SignedTid/text()"s,
          start: ~x"//SignedStart/text()"s,
          expiry: ~x"//SignedExpiry/text()"s,
          service: ~x"//SignedService/text()"s,
          version: ~x"//SignedVersion/text()"s,
          value: ~x"//Value/text()"s
        ))}
      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, "azure user delegation key request failed with status #{status}: #{inspect(body)}"}
      {:error, err} ->
        {:error, "azure user delegation key request failed: #{inspect(err)}"}
    end
  end

  def timestamp(%DateTime{} = dt), do: Calendar.strftime(dt, "%Y-%m-%dT%H:%M:%SZ")

  defp authority() do
    System.get_env("AZURE_AUTHORITY_HOST", "https://login.microsoftonline.com")
    |> String.trim_trailing("/")
  end

  defp read_token(file) do
    case File.read(file) do
      {:ok, token} -> {:ok, token}
      {:error, reason} -> {:error, "could not read federated token #{file}: #{:file.format_error(reason)}"}
    end
  end

  defp env(name) do
    case System.get_env(name) do
      v when is_binary(v) and byte_size(v) > 0 -> {:ok, v}
      _ -> {:error, "#{name} is not set, azure storage requires an access key or workload identity"}
    end
  end

  defp to_int(v) when is_integer(v), do: v
  defp to_int(v) when is_binary(v), do: String.to_integer(v)
end
