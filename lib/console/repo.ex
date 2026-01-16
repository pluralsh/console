defmodule Console.Repo do
  use Ecto.Repo,
    otp_app: :console,
    adapter: Ecto.Adapters.Postgres

  use Bourne

  def locked(%mod{id: id}) do
    mod.with_lock()
    |> get(id)
  end

  def configure_iam_authentication(opts, region) do
    token = ExAws.RDS.generate_db_auth_token(
      opts[:hostname],
      opts[:username],
      opts[:port],
      (if is_binary(region), do: %{region: region}, else: %{})
    )

    Keyword.merge(opts, [password: token, ssl: rds_ssl_opts(:aws, opts[:hostname])])
  end

  def setup_rds_iam(username) do
    query("GRANT rds_iam TO \"#{username}\"", [])
  end

  def rds_ssl_opts(:aws, url) do
    [
      verify: :verify_peer,
      cacertfile: Path.join(:code.priv_dir(:console), "certs/aws.pem"),
      depth: 10,
      server_name_indication: parse_hostname(url)
    ]
  end

  def rds_ssl_opts(:azure, url) do
    [
      protocol: :tls,
      protocol_version: :"tlsv1.3",
      verify: :verify_peer,
      cacertfile: Path.join(:code.priv_dir(:console), "certs/azure.pem"),
      server_name_indication: parse_hostname(url),
      depth: 3
    ]
  end

  defp parse_hostname(url) do
    case URI.parse(url) do
      %URI{host: host} when is_binary(host) -> String.to_charlist(host)
      _ -> String.to_charlist(url)
    end
  end
end
