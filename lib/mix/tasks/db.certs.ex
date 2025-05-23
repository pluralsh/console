defmodule Mix.Tasks.Db.Certs do
  require Logger
  @deps ~w(logger httpoison hackney)a

  @urls [
    aws: ~w(https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem),
    azure: ~w(
      https://www.microsoft.com/pkiops/certs/microsoft%20azure%20rsa%20tls%20issuing%20ca%2004%20-%20xsign.crt
      https://www.microsoft.com/pkiops/certs/Microsoft%20RSA%20Root%20Certificate%20Authority%202017.crt
      https://cacerts.digicert.com/DigiCertGlobalRootG2.crt.pem
      https://dl.cacerts.digicert.com/DigiCertGlobalRootG2.crt.pem
      https://cacerts.digicert.com/DigiCertGlobalRootCA.crt
    ),
  ]

  @re ~r/-----END CERTIFICATE-----\s+-----BEGIN CERTIFICATE-----/
  @replacement "-----END CERTIFICATE-----\n\n-----BEGIN CERTIFICATE-----"

  def run(_) do
    path = Path.join(:code.priv_dir(:console), "certs")
    Enum.each(@deps, &Application.ensure_all_started/1)
    Enum.each(@urls, fn {scope, urls} ->
      build_pem(path, scope, urls)
    end)
  end

  defp build_pem(path, scope, urls) do
    Enum.reduce(urls, [], fn url, acc ->
      case HTTPoison.get(url) do
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
          [parse(body, url) | acc]
        {:ok, %HTTPoison.Response{body: body}} ->
          Logger.info("Error fetching RDS CA: #{inspect(body)}")
          acc
        {:error, error} ->
          Logger.error("HTTP error: #{inspect(error)}")
          acc
      end
    end)
    |> dump(Path.join(path, "#{scope}.pem"))
  end

  defp parse(body, url) do
    case String.ends_with?(url, ".crt") do
      true ->
        X509.Certificate.from_der!(body)
        |> X509.Certificate.to_pem()
      _ -> body
    end
  end

  defp dump([], _), do: Logger.info "no certs found, an error likely happened"
  defp dump([_ | _] = certs, path) do
    formatted = Enum.join(certs, "\n\n")
    File.write!(path, String.replace(formatted, @re, @replacement))
  end
end
