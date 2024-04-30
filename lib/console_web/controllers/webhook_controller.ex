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
    with %ScmWebhook{} = hook <- Git.get_scm_webhook_by_ext_id(id),
         :ok <- verify(conn, hook),
         {:ok, url, params} <- Dispatcher.pr(hook, conn.body_params),
         {:ok, _} <- Git.upsert_pull_request(params, url) do
      json(conn, %{ignored: false, message: "updated pull request"})
    else
      :reject -> send_resp(conn, 403, "Forbidden")
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

  defp verify(conn, %ScmWebhook{type: :github, hmac: hmac}) do
    with [signature] <- get_req_header(conn, "x-hub-signature-256"),
         computed = :crypto.mac(:hmac, :sha256, hmac, conn.assigns.raw_body),
         true <- Plug.Crypto.secure_compare(signature, "sha256=#{Base.encode16(computed, case: :lower)}") do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(conn, %ScmWebhook{type: :gitlab, hmac: hmac}) do
    with [token] <- get_req_header(conn, "x-gitlab-token"),
         true <- Plug.Crypto.secure_compare(hmac, token) do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(_, _), do: :reject
end
