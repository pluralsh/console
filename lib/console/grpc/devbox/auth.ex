defmodule Console.GRPC.Devbox.Auth do
  @moduledoc """
  Authenticates the KAS -> console hop for `devbox.v1.Ingest`, and signs the console -> KAS hop for
  `devbox.v1.Control`.

  Both directions use KAS's internal-api convention (`grpctool.JWTAuther`): an `authorization: Bearer <jwt>`
  metadata entry holding a short-lived HS256 JWT signed with a secret shared by console and KAS
  (`KAS_DEVBOX_SECRET`, normally the same value as KAS's `.api_secret`).  Console -> KAS tokens carry
  `aud: gitlab-kas`, the audience KAS's internal api listener checks; KAS -> console tokens must carry
  `aud: plural-console` (or no audience).

  Once authenticated, the cluster is the one KAS verified and stamped in `devbox-cluster-id`.
  """
  use Nebulex.Caching
  alias Console.Schema.Cluster
  alias Console.Deployments.Clusters

  @multilevel_adapter Console.conf(:multilevel_cache)
  @cluster_header "devbox-cluster-id"
  @kas_audience "gitlab-kas"
  @console_audience "plural-console"
  @ttl 60

  @spec cluster_header() :: binary
  def cluster_header(), do: @cluster_header

  @doc """
  Authenticates an Ingest call and returns the cluster it is for, raising `GRPC.RPCError` otherwise.
  """
  @spec authenticate!(GRPC.Server.Stream.t) :: Cluster.t
  def authenticate!(stream) do
    headers = headers(stream)
    with {:ok, _} <- verify(headers["authorization"]),
         {:ok, cluster} <- cluster(headers[@cluster_header]) do
      cluster
    else
      {:error, msg} -> raise GRPC.RPCError, status: :unauthenticated, message: msg
    end
  end

  defp headers(stream) do
    GRPC.Stream.get_headers(stream) || %{}
  rescue
    _ -> %{}
  end

  @doc """
  Verifies a `Bearer <jwt>` authorization value against the shared secret.
  """
  @spec verify(binary | nil) :: {:ok, map} | {:error, binary}
  def verify("Bearer " <> token), do: verify_token(token)
  def verify("bearer " <> token), do: verify_token(token)
  def verify(_), do: {:error, "missing bearer token"}

  defp verify_token(token) do
    with {:ok, signer} <- signer(),
         {:ok, claims} <- Joken.verify(token, signer),
         :ok <- check_exp(claims),
         :ok <- check_aud(claims) do
      {:ok, claims}
    else
      {:error, msg} when is_binary(msg) -> {:error, msg}
      _ -> {:error, "invalid bearer token"}
    end
  end

  defp check_exp(%{"exp" => exp}) when is_integer(exp) do
    case exp > System.system_time(:second) do
      true -> :ok
      false -> {:error, "bearer token has expired"}
    end
  end
  defp check_exp(_), do: {:error, "bearer token has no expiry"}

  defp check_aud(%{"aud" => @console_audience}), do: :ok
  defp check_aud(%{"aud" => [_ | _] = auds}) do
    case @console_audience in auds do
      true -> :ok
      false -> {:error, "bearer token is not for console"}
    end
  end
  defp check_aud(%{"aud" => _}), do: {:error, "bearer token is not for console"}
  defp check_aud(_), do: :ok

  defp cluster(id) when is_binary(id) and byte_size(id) > 0 do
    with {:ok, id} <- Ecto.UUID.cast(id),
         %Cluster{} = cluster <- cached_cluster(id) do
      {:ok, cluster}
    else
      _ -> {:error, "unknown cluster #{id}"}
    end
  end
  defp cluster(_), do: {:error, "missing #{@cluster_header} metadata"}

  # every gateway call authenticates, and only the cluster's identity is used, so a few minutes' staleness is fine
  @decorate cacheable(
              cache: @multilevel_adapter,
              key: {:devbox_auth_cluster, id},
              opts: [ttl: :timer.minutes(5)],
              match: &cluster?/1
            )
  defp cached_cluster(id), do: Clusters.get_cluster(id)

  defp cluster?(%Cluster{}), do: true
  defp cluster?(_), do: false

  @doc """
  The metadata for a console -> KAS Control call on behalf of a cluster.
  """
  @spec control_metadata(binary) :: {:ok, map} | {:error, binary}
  def control_metadata(cluster_id) do
    with {:ok, token} <- sign(@kas_audience),
      do: {:ok, %{"authorization" => "Bearer #{token}", @cluster_header => cluster_id}}
  end

  @doc """
  Signs a short-lived token with the shared secret, as KAS's api listener expects.
  """
  @spec sign(binary) :: {:ok, binary} | {:error, binary}
  def sign(audience \\ @kas_audience) do
    now = System.system_time(:second)
    with {:ok, signer} <- signer(),
         {:ok, token, _} <- Joken.encode_and_sign(%{"aud" => audience, "iss" => @console_audience, "iat" => now, "exp" => now + @ttl}, signer) do
      {:ok, token}
    else
      {:error, msg} when is_binary(msg) -> {:error, msg}
      err -> {:error, "could not sign kas token: #{inspect(err)}"}
    end
  end

  # KAS base64-decodes its secret files (`ioz.LoadBase64Secret`), so the configured value is the file's contents
  defp signer() do
    case Console.conf(:kas_devbox_secret) do
      secret when is_binary(secret) and byte_size(secret) > 0 -> {:ok, Joken.Signer.create("HS256", decode_secret(secret))}
      _ -> {:error, "no kas devbox secret is configured"}
    end
  end

  defp decode_secret(secret) do
    case Base.decode64(String.trim(secret)) do
      {:ok, key} -> key
      :error -> secret
    end
  end
end
