defmodule Console.Mailer do
  use Bamboo.Mailer, otp_app: :console
  alias Console.Deployments.Settings
  alias Console.Schema.DeploymentSettings
  require Logger

  @spec maybe_deliver(Bamboo.Email.t) :: :ok | Console.error
  def maybe_deliver(email) do
    with {:ok, conf} <- smtp_config(),
         {:ok, _} <- deliver_now(email, config: conf) do
      :ok
    else
      {:error, err} ->
        Logger.info "not delivering email, reason: #{err}"
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

  defp smtp_config() do
    case Settings.cached() do
      %DeploymentSettings{smtp: %DeploymentSettings.SMTP{} = smtp} ->
        {:ok, Map.take(smtp, DeploymentSettings.smtp_config())}
      _ -> {:error, "smtp not configured"}
    end
  end
end
