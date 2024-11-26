defmodule ConsoleWeb.WebhookController do
  use ConsoleWeb, :controller
  alias Console.Services.{Builds, Users}
  alias Console.Schema.{ScmWebhook, Cluster, ObservabilityWebhook}
  alias Console.Deployments.{Git, Clusters, Observability}

  require Logger

  plug ConsoleWeb.Verifier when action == :webhook

  def cluster(conn, _) do
    with {:ok, _, token} <- ConsoleWeb.Plugs.Token.get_bearer_token(conn),
         ["plrl", id, auth] <- String.split(token, ":"),
         {:ok, _, _} <- Console.Guardian.resource_from_token(auth),
         %Cluster{id: id} = Clusters.get_cluster(id) do
      send_resp(conn, 200, id)
    else
      _ -> send_resp(conn, 400, "invalid token")
    end
  end

  def scm(conn, %{"id" => id}) do
    with %ScmWebhook{} = hook <- Git.get_scm_webhook_by_ext_id(id),
         :ok <- verify(conn, hook),
         {:ok, resp} <- Git.Webhooks.webhook(hook, conn.body_params) do
      json(conn, resp)
    else
      :reject -> send_resp(conn, 403, "Forbidden")
      err ->
        Logger.info "Did not process scm webhook, result: #{inspect(err)}"
        json(conn, %{ignored: true})
    end
  end

  def observability(conn, %{"id" => id} = attrs) do
    with %ObservabilityWebhook{} = hook <- Observability.get_webhook_by_ext_id(id),
         :ok <- verify(conn, hook),
         {:ok, attrs} <- Observability.Webhook.payload(hook, attrs),
         {:ok, _} <- Observability.persist_alert(attrs) do
      json(conn, %{ignored: false, message: "persisted alert"})
    else
      :reject -> send_resp(conn, 403, "Forbidden")
      err ->
        Logger.info "did not process observability webhook, result: #{inspect(err)}"
        json(conn, %{ignored: true})
    end
  end

  def webhook(conn, params) do
    bot = Users.get_bot!("console")
    with {:ok, _} <- Builds.create(params, bot),
      do: json(conn, %{ok: true})
  end

  defp verify(conn, %ScmWebhook{type: :github, hmac: hmac}) do
    with [signature] <- get_req_header(conn, "x-hub-signature-256"),
         computed = :crypto.mac(:hmac, :sha256, hmac, Enum.reverse(conn.assigns.raw_body)),
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

  defp verify(conn, %ObservabilityWebhook{type: :grafana, secret: secret}) do
    with {_, password} <- Plug.BasicAuth.parse_basic_auth(conn),
         true <- Plug.Crypto.secure_compare(secret, password) do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(_, _), do: :reject
end
