defmodule Console.Deployments.FerroTunnel do
  @moduledoc """
  Generates the shared FerroTunnel token, CA, and server certificate once,
  then writes them into the Secret the console chart mounts.
  """
  use Console.Services.Base
  require Logger
  alias Console.Deployments.Settings
  alias Console.Schema.{Cluster, DeploymentSettings}
  alias Kube.Utils

  @secret_name "ferrotunnel-server"

  @doc """
  Creates the tunnel material when it is missing, then refreshes the server Secret.
  """
  def ensure() do
    prior = current_server_cert()

    with {:ok, settings} <- ensure_credentials(),
         :ok <- publish_secret(settings),
         :ok <- refresh_operators(prior, settings),
      do: {:ok, settings}
  end

  @doc """
  Persists the CA, server certificate, and token on deployment settings.
  A second call keeps the existing token. A hostname change reissues the
  server certificate with the same CA and token.
  """
  def ensure_credentials() do
    case Settings.fetch_consistent() do
      %DeploymentSettings{ferrotunnel: %DeploymentSettings.FerroTunnel{token: token} = tunnel} = settings
          when is_binary(token) ->
        refresh_server(settings, tunnel, hostname())
      %DeploymentSettings{} = settings ->
        case hostname() do
          host when is_binary(host) and host != "" ->
            Settings.put_ferrotunnel(settings, material(host))
          _ ->
            {:ok, settings}
        end
      _ ->
        {:ok, nil}
    end
  end

  def publish_secret(%DeploymentSettings{ferrotunnel: %DeploymentSettings.FerroTunnel{} = tunnel})
      when is_binary(tunnel.token) do
    try do
      case Utils.upsert_secret(namespace(), @secret_name, %{
        "token" => tunnel.token,
        "tls.crt" => tunnel.server_cert,
        "tls.key" => tunnel.server_key,
        "ca.crt" => tunnel.ca_cert
      }) do
        {:ok, _} -> :ok
        {:error, err} ->
          Logger.warning("ferrotunnel server secret was not written: #{inspect(err)}")
          :ok
      end
    rescue
      err ->
        Logger.warning("ferrotunnel server secret was not written: #{Exception.message(err)}")
        :ok
    end
  end
  def publish_secret(_), do: :ok

  @doc """
  Returns the deploy-operator configuration for this cluster, creating its
  client certificate on the first call. An empty list means the console host
  is unset, so the tunnel controller stays disabled.
  """
  def configuration(%Cluster{} = cluster) do
    with {:ok, %DeploymentSettings{ferrotunnel: %DeploymentSettings.FerroTunnel{token: token} = tunnel}}
           when is_binary(token) <- ensure_credentials(),
         {:ok, cluster} <- ensure_client(cluster, tunnel),
         host when is_binary(host) and host != "" <- hostname() do
      [
        %{name: "tunnelServer", value: "#{host}:7835"},
        %{name: "tunnelToken", value: token},
        %{name: "tunnelCa", value: Base.encode64(tunnel.ca_cert)},
        %{name: "tunnelCert", value: Base.encode64(cluster.tunnel_cert)},
        %{name: "tunnelKey", value: Base.encode64(cluster.tunnel_key)}
      ]
    else
      _ -> []
    end
  end

  defp ensure_client(%Cluster{tunnel_cert: cert, tunnel_key: key} = cluster, _)
       when is_binary(cert) and is_binary(key), do: {:ok, cluster}
  defp ensure_client(%Cluster{} = cluster, %DeploymentSettings.FerroTunnel{} = tunnel) do
    cluster
    |> Cluster.tunnel_changeset(client_material(cluster, tunnel))
    |> Console.Repo.update()
  end

  defp refresh_server(settings, %DeploymentSettings.FerroTunnel{} = tunnel, host)
       when is_binary(host) and host != "" do
    case cert_matches?(tunnel.server_cert, host) do
      true -> {:ok, settings}
      false ->
        Logger.info("reissuing ferrotunnel server certificate for #{host}")
        Settings.put_ferrotunnel(settings, reissued_material(tunnel, host))
    end
  end
  defp refresh_server(settings, _, _), do: {:ok, settings}

  defp refresh_operators(prior, %DeploymentSettings{ferrotunnel: %DeploymentSettings.FerroTunnel{server_cert: cert}})
       when is_binary(cert) and prior != cert do
    user = %{Console.Services.Users.get_bot!("console") | roles: %{admin: true}}

    Cluster.ordered()
    |> Console.Repo.all()
    |> Enum.each(fn %Cluster{} = cluster ->
      case Console.Deployments.Services.update_operator_service(cluster, user) do
        {:ok, _} -> :ok
        {:error, err} ->
          Logger.warning("ferrotunnel operator configuration was not updated for #{cluster.id}: #{inspect(err)}")
      end
    end)
  end
  defp refresh_operators(_, _), do: :ok

  defp current_server_cert() do
    case Settings.fetch_consistent() do
      %DeploymentSettings{ferrotunnel: %DeploymentSettings.FerroTunnel{server_cert: cert}} when is_binary(cert) ->
        cert
      _ ->
        nil
    end
  end

  defp material(host) do
    ca_key = X509.PrivateKey.new_ec(:secp256r1)
    ca = X509.Certificate.self_signed(ca_key, "/CN=Plural FerroTunnel CA", template: :root_ca)
    {server_cert, server_key} = server_pair(host, ca, ca_key)

    %{
      token: "tunnel-" <> Console.rand_alphanum(48),
      ca_cert: X509.Certificate.to_pem(ca),
      ca_key: X509.PrivateKey.to_pem(ca_key),
      server_cert: server_cert,
      server_key: server_key
    }
  end

  defp reissued_material(%DeploymentSettings.FerroTunnel{} = tunnel, host) do
    ca = X509.Certificate.from_pem!(tunnel.ca_cert)
    ca_key = X509.PrivateKey.from_pem!(tunnel.ca_key)
    {server_cert, server_key} = server_pair(host, ca, ca_key)

    %{
      token: tunnel.token,
      ca_cert: tunnel.ca_cert,
      ca_key: tunnel.ca_key,
      server_cert: server_cert,
      server_key: server_key
    }
  end

  defp server_pair(host, ca, ca_key) do
    server_key = X509.PrivateKey.new_ec(:secp256r1)
    server = X509.PublicKey.derive(server_key)
             |> X509.Certificate.new("/CN=#{host}", ca, ca_key,
               extensions: [
                 subject_alt_name: X509.Certificate.Extension.subject_alt_name([host]),
                 key_usage: X509.Certificate.Extension.key_usage([:digitalSignature, :keyEncipherment]),
                 ext_key_usage: X509.Certificate.Extension.ext_key_usage([:serverAuth])
               ]
             )

    {X509.Certificate.to_pem(server), X509.PrivateKey.to_pem(server_key)}
  end

  defp cert_matches?(pem, host) when is_binary(pem) and is_binary(host) do
    cert = X509.Certificate.from_pem!(pem)

    case X509.Certificate.extension(cert, :subject_alt_name) do
      {:Extension, _, _, names} ->
        Enum.any?(names, fn
          {:dNSName, name} -> to_string(name) == host
          _ -> false
        end)
      _ ->
        false
    end
  end
  defp cert_matches?(_, _), do: false

  defp client_material(%Cluster{id: id}, %DeploymentSettings.FerroTunnel{} = tunnel) do
    ca = X509.Certificate.from_pem!(tunnel.ca_cert)
    ca_key = X509.PrivateKey.from_pem!(tunnel.ca_key)
    key = X509.PrivateKey.new_ec(:secp256r1)
    cert = X509.PublicKey.derive(key)
           |> X509.Certificate.new("/CN=#{id}", ca, ca_key,
             extensions: [
               key_usage: X509.Certificate.Extension.key_usage([:digitalSignature]),
               ext_key_usage: X509.Certificate.Extension.ext_key_usage([:clientAuth])
             ]
           )

    %{
      tunnel_cert: X509.Certificate.to_pem(cert),
      tunnel_key: X509.PrivateKey.to_pem(key)
    }
  end

  defp hostname() do
    case Console.conf(:hostname) do
      host when is_binary(host) and host != "" -> "ferrotunnel." <> host
      _ -> nil
    end
  end

  defp namespace(), do: System.get_env("NAMESPACE") || "console"
end
