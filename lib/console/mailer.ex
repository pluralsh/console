defmodule Console.Mailer do
  use Swoosh.Mailer, otp_app: :console
  alias Console.Deployments.Settings
  alias Console.Schema.DeploymentSettings
  require Logger

  @not_config "smtp not configured"

  @spec maybe_deliver(Swoosh.Email.t()) :: :ok | Console.error
  def maybe_deliver(email) do
    with {:ok, conf} <- smtp_config(),
         {:ok, _} <- deliver(email, conf) do
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
        parse_sender(sender)
      _ -> {"Plural.sh", "notifications@plural.sh"}
    end
  end

  def smtp_config() do
    case Settings.cached() do
      %DeploymentSettings{smtp: %DeploymentSettings.SMTP{} = config} -> {:ok, smtp(config)}
      _ -> {:error, @not_config}
    end
  end

  defp smtp(%DeploymentSettings.SMTP{user: u, password: p, server: s, port: port, ssl: ssl}) do
    [
      relay: s,
      username: u,
      password: p,
      port: port,
      ssl: !!ssl,
      auth: :always,
      tls: :always,
      tls_options: [verify: :verify_none]
    ]
  end

  # Accepts strings like "Name <email@example.com>" or "Name<email@example.com>"
  # and converts them to a {name, address} tuple expected by Swoosh.
  # Plain email addresses are returned as-is.
  defp parse_sender(sender) do
    case Regex.run(~r/^\s*(.*?)\s*<\s*(.+?)\s*>\s*$/, sender) do
      [_, name, address] -> {name, address}
      _ -> sender
    end
  end
end
