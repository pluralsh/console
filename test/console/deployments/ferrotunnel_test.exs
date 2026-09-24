defmodule Console.Deployments.FerroTunnelTest do
  use Console.DataCase, async: false
  alias Console.Deployments.{FerroTunnel, Settings}
  alias Console.Schema.{Cluster, DeploymentSettings}

  describe "#ensure_credentials/0" do
    test "it generates one token and a server certificate for the console host" do
      previous = Application.get_env(:console, :hostname)
      Application.put_env(:console, :hostname, "console.example.com")
      on_exit(fn ->
        if previous, do: Application.put_env(:console, :hostname, previous), else: Application.delete_env(:console, :hostname)
      end)

      insert(:deployment_settings)

      {:ok, settings} = FerroTunnel.ensure_credentials()
      tunnel = settings.ferrotunnel

      assert String.starts_with?(tunnel.token, "tunnel-")
      refute String.starts_with?(tunnel.token, "deploy-")
      assert String.contains?(tunnel.ca_cert, "BEGIN CERTIFICATE")
      assert String.contains?(tunnel.server_key, "BEGIN")

      cert = X509.Certificate.from_pem!(tunnel.server_cert)
      {:Extension, _, _, names} = X509.Certificate.extension(cert, :subject_alt_name)
      assert Enum.any?(names, fn
        {:dNSName, name} -> to_string(name) == "console.example.com"
        _ -> false
      end)

      {:ok, again} = FerroTunnel.ensure_credentials()
      assert again.ferrotunnel.token == tunnel.token
      assert again.ferrotunnel.server_cert == tunnel.server_cert
    end

    test "a regular settings update leaves the tunnel material in place" do
      previous = Application.get_env(:console, :hostname)
      Application.put_env(:console, :hostname, "console.example.com")
      on_exit(fn ->
        if previous, do: Application.put_env(:console, :hostname, previous), else: Application.delete_env(:console, :hostname)
      end)

      insert(:deployment_settings)
      {:ok, settings} = FerroTunnel.ensure_credentials()

      {:ok, updated} =
        settings
        |> DeploymentSettings.changeset(%{name: "global"})
        |> Console.Repo.update()

      assert updated.ferrotunnel.token == settings.ferrotunnel.token
      refute Settings.fetch_consistent().ferrotunnel.token == nil
    end
  end

  describe "#configuration/1" do
    test "it returns no configuration when deployment settings are missing" do
      cluster = insert(:cluster)
      assert FerroTunnel.configuration(cluster) == []
    end

    test "it signs one client certificate and returns the operator configuration" do
      previous = Application.get_env(:console, :hostname)
      Application.put_env(:console, :hostname, "console.example.com")
      on_exit(fn ->
        if previous, do: Application.put_env(:console, :hostname, previous), else: Application.delete_env(:console, :hostname)
      end)

      insert(:deployment_settings)
      cluster = insert(:cluster)

      config = Map.new(FerroTunnel.configuration(cluster), fn %{name: name, value: value} -> {name, value} end)

      assert config["tunnelServer"] == "console.example.com:7835"
      assert String.starts_with?(config["tunnelToken"], "tunnel-")

      cert = config["tunnelCert"] |> Base.decode64!() |> X509.Certificate.from_pem!()
      {:Extension, _, _, usages} = X509.Certificate.extension(cert, :ext_key_usage)
      assert {1, 3, 6, 1, 5, 5, 7, 3, 2} in usages
      assert inspect(X509.Certificate.subject(cert)) =~ cluster.id

      saved = Console.Repo.get!(Cluster, cluster.id)
      assert saved.tunnel_cert == Base.decode64!(config["tunnelCert"])
      assert String.contains?(saved.tunnel_key, "BEGIN")

      again = Map.new(FerroTunnel.configuration(saved), fn %{name: name, value: value} -> {name, value} end)
      assert again["tunnelCert"] == config["tunnelCert"]
      assert again["tunnelKey"] == config["tunnelKey"]
    end
  end
end
