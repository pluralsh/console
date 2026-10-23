defmodule ConsoleWeb.WebhookController do
  use ConsoleWeb, :controller
  alias Console.Repo
  alias Console.Schema.{ScmWebhook, Cluster, ObservabilityWebhook, IssueWebhook, ChatConnection}
  alias Console.Deployments.{Git, Clusters, Observability, Integrations, Issues}
  alias Console.Chat.Impl.Teams, as: TeamsBot
  alias Console.Chat.Teams.Auth, as: TeamsAuth

  def cluster(conn, _) do
    with {:ok, _, token} <- ConsoleWeb.Plugs.Token.get_bearer_token(conn),
         ["plrl", id, auth] <- String.split(token, ":"),
         {:ok, _, _} <- Console.Guardian.resource_from_token(auth),
         %Cluster{id: id} <- Clusters.get_cluster(id) do
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

  def observability(conn, %{"id" => id}) do
    with %ObservabilityWebhook{} = hook <- Observability.get_webhook_by_ext_id(id),
         :ok <- verify(conn, hook),
         {:ok, attrs} <- Observability.Webhook.payload(hook, conn.body_params),
         {:ok, _} <- Observability.persist_alert(attrs) do
      json(conn, %{ignored: false, message: "persisted alert"})
    else
      :reject -> send_resp(conn, 403, "Forbidden")
      _err ->
        json(conn, %{ignored: true})
    end
  end

  def teams(conn, %{"id" => id}) do
    activity = conn.body_params

    with %ChatConnection{type: :teams, configuration: %{teams: %{client_id: cid}}} = chat <- Repo.get(ChatConnection, id),
         true <- is_binary(cid),
         {:ok, _, token} <- ConsoleWeb.Plugs.Token.get_bearer_token(conn),
         {:ok, _} <- TeamsAuth.verify(token, cid, service_url: activity["serviceUrl"]),
         :ok <- TeamsBot.handle_activity(chat, activity) do
      json(conn, %{ignored: false})
    else
      {:error, _} -> send_resp(conn, 401, "Unauthorized")
      _ -> json(conn, %{ignored: true})
    end
  end

  def issue(conn, %{"id" => id}) do
    case {Integrations.get_issue_webhook_by_ext_id(id), get_req_header(conn, "x-hook-secret")} do
      {%IssueWebhook{provider: :asana} = hook, [secret]} -> asana_handshake(conn, hook, secret)
      {hook, _} -> handle_issue(conn, hook)
    end
  end

  # Asana's handshake is unauthenticated, so only the first one is trusted (see Integrations.record_handshake_secret/2)
  defp asana_handshake(conn, hook, secret) do
    case Integrations.record_handshake_secret(hook, secret) do
      {:ok, _} ->
        conn
        |> put_resp_header("x-hook-secret", secret)
        |> send_resp(200, "")
      _ -> send_resp(conn, 403, "Forbidden")
    end
  end

  defp handle_issue(conn, hook) do
    with %IssueWebhook{} <- hook,
         :ok <- verify(conn, hook),
         {:ok, attrs} <- Issues.Webhook.payload(hook, conn.body_params),
         {:ok, _} <- Integrations.upsert_issue(attrs) do
      json(conn, %{ignored: false, message: "persisted issue"})
    else
      :reject -> send_resp(conn, 403, "Forbidden")
      _err -> json(conn, %{ignored: true})
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

  defp verify(conn, %ScmWebhook{type: :azure_devops, hmac: hmac}) do
    case Plug.BasicAuth.parse_basic_auth(conn) do
      {_, ^hmac} -> :ok
      _ -> :reject
    end
  end

  defp verify(conn, %ScmWebhook{type: :bitbucket, hmac: hmac}) do
    with [signature] <- get_req_header(conn, "x-hub-signature"),
         computed = :crypto.mac(:hmac, :sha256, hmac, Enum.reverse(conn.assigns.raw_body)),
         true <- Plug.Crypto.secure_compare(signature, "sha256=#{Base.encode16(computed, case: :lower)}") do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(conn, %ScmWebhook{type: :bitbucket_datacenter, hmac: hmac}) do
    case Plug.BasicAuth.parse_basic_auth(conn) do
      {_, ^hmac} -> :ok
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

  defp verify(conn, %ObservabilityWebhook{type: :alertops, secret: secret}) do
    with {_, password} <- Plug.BasicAuth.parse_basic_auth(conn),
         true <- Plug.Crypto.secure_compare(secret, password) do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(conn, %IssueWebhook{provider: :linear, secret: secret}) do
    with [signature] <- get_req_header(conn, "linear-signature"),
          mac = :crypto.mac(:hmac, :sha256, secret, Enum.reverse(conn.assigns.raw_body)),
          computed_signature = Base.encode16(mac, case: :lower),
          true <- Plug.Crypto.secure_compare(signature, computed_signature) do
      :ok
    else
      _ -> :reject
    end
  end

  # Admin webhooks sign the body (X-Hub-Signature); automation rules send the secret as a header.
  # A signature header, when present, must be valid: it never falls back to the shared secret.
  defp verify(conn, %IssueWebhook{provider: :jira, secret: secret}) do
    case {get_req_header(conn, "x-hub-signature"), get_req_header(conn, "x-atlassian-webhook-secret")} do
      {[signature], _} -> verify_websub_signature(conn, signature, secret)
      {[], [token]} -> secure_verify(token, secret)
      _ -> :reject
    end
  end

  # Asana signs with the secret from its handshake; relays sign with the webhook's own secret
  defp verify(conn, %IssueWebhook{provider: :asana, secret: secret, handshake_secret: handshake}) do
    with [signature] <- get_req_header(conn, "x-hook-signature"),
         body = Enum.reverse(conn.assigns.raw_body),
         true <- Enum.any?([secret, handshake], &valid_asana_signature?(&1, body, signature)) do
      :ok
    else
      _ -> :reject
    end
  end

  defp verify(conn, %IssueWebhook{provider: :github, secret: secret}),
    do: verify(conn, %ScmWebhook{type: :github, hmac: secret})

  defp verify(conn, %IssueWebhook{provider: :gitlab, secret: secret}),
    do: verify(conn, %ScmWebhook{type: :gitlab, hmac: secret})

  defp verify(conn, %IssueWebhook{provider: :azure_devops, secret: secret}),
    do: verify(conn, %ScmWebhook{type: :azure_devops, hmac: secret})

  defp verify(conn, %IssueWebhook{provider: :bitbucket, secret: secret}),
    do: verify(conn, %ScmWebhook{type: :bitbucket, hmac: secret})

  defp verify(conn, %IssueWebhook{provider: :bitbucket_datacenter, secret: secret}),
    do: verify(conn, %ScmWebhook{type: :bitbucket_datacenter, hmac: secret})

  # A signature header, when present, must be valid: it never falls back to the shared secret.
  defp verify(conn, %IssueWebhook{provider: :service_now, secret: secret}) do
    case {get_req_header(conn, "x-plural-signature"), get_req_header(conn, "x-plural-webhook-secret")} do
      {[signature], _} -> verify_service_now_signature(conn, signature, secret)
      {[], [token]} -> secure_verify(token, secret)
      _ -> :reject
    end
  end

  defp verify(_, _), do: :reject

  defp verify_service_now_signature(conn, signature, secret) do
    mac = :crypto.mac(:hmac, :sha256, secret, Enum.reverse(conn.assigns.raw_body))
    signature = signature |> String.trim() |> String.replace_prefix("sha256=", "")

    case Plug.Crypto.secure_compare(String.downcase(signature), Base.encode16(mac, case: :lower)) or
           Plug.Crypto.secure_compare(signature, Base.encode64(mac)) do
      true -> :ok
      false -> :reject
    end
  end

  @websub_methods %{"sha1" => :sha, "sha256" => :sha256, "sha384" => :sha384, "sha512" => :sha512}

  defp verify_websub_signature(conn, signature, secret) do
    with [method, sig] <- String.split(String.trim(signature), "=", parts: 2),
         {:ok, alg} <- Map.fetch(@websub_methods, String.downcase(method)),
         mac = :crypto.mac(:hmac, alg, secret, Enum.reverse(conn.assigns.raw_body)),
         true <- Plug.Crypto.secure_compare(String.downcase(sig), Base.encode16(mac, case: :lower)) do
      :ok
    else
      _ -> :reject
    end
  end

  defp valid_asana_signature?(secret, body, signature) when is_binary(secret) do
    mac = :crypto.mac(:hmac, :sha256, secret, body)
    Plug.Crypto.secure_compare(signature, Base.encode16(mac, case: :lower))
  end
  defp valid_asana_signature?(_, _, _), do: false

  defp secure_verify(token, secret) do
    case Plug.Crypto.secure_compare(token, secret) do
      true -> :ok
      false -> :reject
    end
  end
end
