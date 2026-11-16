defmodule Console.Devboxes.StreamToken do
  @moduledoc """
  Short-lived tokens for the terminal, vnc and preview WebSockets the browser opens against KAS
  (`/ext/devbox/streams/<stream_id>`).  KAS validates them and forwards the socket to the gateway with
  `devbox-instance-id` and `devbox-stream-id` metadata.

  HS256 JWTs signed with `DEVBOX_STREAM_TOKEN_KEY` (raw bytes), with the claims named in `devbox.v1.OpenStreamResponse`
  (`cluster_id`, `instance_id`, `stream_id`, `kind`, `sub`, `exp`), mirrored as `cluster` and `instance`.  `exp` never
  outlives the gateway's stream registration and is at most 5 minutes away.
  """
  alias Console.Schema.{DevboxInstance, User}

  @ttl 5 * 60
  @audience "kas-devbox-streams"

  @type stream :: %{stream_id: binary, kind: atom, expires_at: DateTime.t | nil}

  @spec ttl() :: integer
  def ttl(), do: @ttl

  @doc """
  Mints a token for a stream the gateway registered on an instance.
  """
  @spec mint(DevboxInstance.t, stream, User.t) :: {:ok, binary, DateTime.t} | {:error, binary}
  def mint(%DevboxInstance{} = inst, %{stream_id: stream_id, kind: kind} = stream, %User{id: user_id}) do
    %{devbox: %{cluster_id: cluster_id}} = Console.Repo.preload(inst, [:devbox])
    now = System.system_time(:second)
    exp = expiry(now, stream[:expires_at])
    claims = %{
      "iss" => Console.url("/"),
      "aud" => @audience,
      "sub" => user_id,
      "iat" => now,
      "exp" => exp,
      "jti" => Ecto.UUID.generate(),
      "cluster_id" => cluster_id,
      "cluster" => cluster_id,
      "instance_id" => inst.id,
      "instance" => inst.id,
      "stream_id" => stream_id,
      "kind" => to_string(kind)
    }

    with {:ok, signer} <- signer(),
         {:ok, token, _} <- Joken.encode_and_sign(claims, signer) do
      {:ok, token, DateTime.from_unix!(exp)}
    else
      {:error, msg} when is_binary(msg) -> {:error, msg}
      err -> {:error, "could not sign stream token: #{inspect(err)}"}
    end
  end

  @doc """
  Verifies a stream token, as KAS does.  Used in tests and by any console-side stream proxy.
  """
  @spec verify(binary) :: {:ok, map} | {:error, binary}
  def verify(token) do
    with {:ok, signer} <- signer(),
         {:ok, %{"exp" => exp, "aud" => @audience} = claims} <- Joken.verify(token, signer),
         true <- exp > System.system_time(:second) || {:error, "stream token has expired"} do
      {:ok, claims}
    else
      {:error, msg} when is_binary(msg) -> {:error, msg}
      _ -> {:error, "invalid stream token"}
    end
  end

  @doc """
  The WebSocket url for a stream: `KAS_DEVBOX_STREAM_URL`, or the KAS host, plus `/ext/devbox/streams/<id>`.
  """
  @spec url(binary) :: binary
  def url(stream_id) do
    base = Console.conf(:kas_devbox_stream_url) || ws_base(Console.conf(:kas_dns))
    "#{String.trim_trailing(base, "/")}/ext/devbox/streams/#{stream_id}"
  end

  defp ws_base("https://" <> rest), do: "wss://#{rest}"
  defp ws_base("http://" <> rest), do: "ws://#{rest}"
  defp ws_base(host) when is_binary(host), do: "wss://#{host}"
  defp ws_base(_), do: ""

  defp expiry(now, %DateTime{} = registered), do: min(now + @ttl, DateTime.to_unix(registered))
  defp expiry(now, _), do: now + @ttl

  defp signer() do
    case Console.conf(:devbox_stream_token_key) do
      key when is_binary(key) and byte_size(key) > 0 -> {:ok, Joken.Signer.create("HS256", key)}
      _ -> {:error, "no devbox stream token key is configured"}
    end
  end
end
