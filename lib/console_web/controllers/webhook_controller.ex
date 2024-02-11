defmodule ConsoleWeb.WebhookController do
  use ConsoleWeb, :controller
  alias Alertmanager.Alert
  alias Console.Services.{Builds, Users, Alertmanager}
  alias Console.Schema.{ScmWebhook}
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Deployments.Git

  require Logger

  plug ConsoleWeb.Verifier when action == :webhook

  def scm(conn, %{"id" => id}) do
    with %ScmWebhook{} = hook <- Git.get_scm_webhook(id),
         {:ok, url, params} <- Dispatcher.pr(hook, conn.body_params),
         {:ok, _} <- Git.update_pull_request(params, url) do
      json(conn, %{ignored: false, message: "updated pull request"})
    else
      err ->
        Logger.info "Did not process scm webhook, result: #{inspect(err)}"
        json(conn, %{ignored: true})
    end
  end

  def webhook(conn, params) do
    bot = Users.get_bot!("console")
    with {:ok, _} <- Builds.create(params, bot),
      do: json(conn, %{ok: true})
  end

  def alertmanager(conn, %{"alerts" => alerts}) when is_list(alerts) do
    Enum.each(alerts, fn alert ->
      Alert.build(alert)
      |> Alertmanager.handle_alert()
    end)

    json(conn, %{ok: true})
  end

  def alertmanager(conn, _payload) do
    json(conn, %{ok: true})
  end
end
