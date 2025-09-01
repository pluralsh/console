defmodule ConsoleWeb.WebhookController do
  use ConsoleWeb, :controller
  alias Console.Schema.{ScmWebhook, Cluster, ObservabilityWebhook}
  alias Console.Deployments.{Git, Clusters, Observability}

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
         _ <- Console.Services.Base.handle_notify(Console.PubSub.ScmWebhook, conn.body_params, actor: hook),
         {:ok, resp} <- Git.Webhooks.webhook(hook, conn.body_params) do
      json(conn, resp)
    else
      :reject -> send_resp(conn, 403, "Forbidden")
      _err ->
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
      _err ->
        json(conn, %{ignored: true})
    end
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

  defp verify(conn, %ObservabilityWebhook{type: :sentry, secret: secret}) do
    with [signature] <- get_req_header(conn, "sentry-hook-signature"),
         ["event_alert"] <- get_req_header(conn, "sentry-hook-resource"),
         computed = :crypto.mac(:hmac, :sha256, secret, Enum.reverse(conn.assigns.raw_body)),
         true <- Plug.Crypto.secure_compare(signature, Base.encode16(computed, case: :lower)) do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(conn, %ObservabilityWebhook{type: :pagerduty, secret: secret}) do
    with [signature] <- get_req_header(conn, "x-pagerduty-signature"),
         mac = :crypto.mac(:hmac, :sha256, secret, Enum.reverse(conn.assigns.raw_body)),
         computed_signature = Base.encode16(mac, case: :lower) do

      String.split(signature, ",")
      |> Enum.any?(fn
        "v1=" <> sig -> Plug.Crypto.secure_compare(sig, computed_signature)
        _ -> false
      end)
      |> case do
        true -> :ok
        false -> :reject
      end
    else
      _ -> :reject
    end
  end

  defp verify(conn, %ObservabilityWebhook{type: :datadog, secret: secret}) do
    with {_, password} <- Plug.BasicAuth.parse_basic_auth(conn),
         true <- Plug.Crypto.secure_compare(secret, password) do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(conn, %ObservabilityWebhook{type: :newrelic, secret: secret}) do
    with {_, password} <- Plug.BasicAuth.parse_basic_auth(conn),
         true <- Plug.Crypto.secure_compare(secret, password) do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(_, _), do: :reject
end
