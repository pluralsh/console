defmodule Console.Mailer do
  use Bamboo.Mailer, otp_app: :console
  alias Console.Deployments.Settings
  alias Console.Schema.DeploymentSettings
  require Logger

  @not_config "smtp not configured"

  @spec maybe_deliver(Bamboo.Email.t) :: :ok | Console.error
  def maybe_deliver(email) do
    with {:ok, conf} <- smtp_config(),
         {:ok, _} <- deliver_now(email, config: conf) do
      :ok
    else
      {:error, @not_config} = err -> err
      {:error, err} ->
        Logger.warning "not delivering email, reason: #{inspect(err)}"
        {:error, err}
    end
  end

  def sender() do
    case Settings.cached() do
      %DeploymentSettings{smtp: %DeploymentSettings.SMTP{sender: sender}} when is_binary(sender) ->
        sender
      _ -> "Plural.sh<notifications@plural.sh>"
    end
  end

  def smtp_config() do
    case Settings.cached() do
      %DeploymentSettings{smtp: %DeploymentSettings.SMTP{} = config} -> {:ok, smtp(config)}
      _ -> {:error, @not_config}
    end
  end

  defp smtp(%DeploymentSettings.SMTP{user: u, password: p, server: s, port: port, ssl: ssl}) do
    %{
      username: u,
      password: p,
      server: s,
      port: port,
      ssl: !!ssl,
      auth: :always,
      tls: :always,
      tls_verify: :verify_none
    }
  end
end
