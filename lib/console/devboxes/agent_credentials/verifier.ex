defmodule Console.Devboxes.AgentCredentials.Verifier do
  @moduledoc """
  One live check of a subscription credential against its vendor when it is linked.  Configured with
  `config :console, :agent_credential_verifier` so tests can swap in a fake.
  """
  alias Console.Schema.AgentCredential

  @doc """
  Verifies a credential, returning non-secret metadata to store (plan, account id, email) or why it was rejected.
  """
  @callback verify(AgentCredential.Kind.t, secret :: binary, metadata :: map) :: {:ok, map} | {:error, binary}

  @spec impl() :: module
  def impl(), do: Console.conf(:agent_credential_verifier, __MODULE__.Http)

  @spec verify(atom, binary, map) :: {:ok, map} | {:error, binary}
  def verify(kind, secret, metadata), do: impl().verify(kind, secret, metadata)
end

defmodule Console.Devboxes.AgentCredentials.Verifier.Http do
  @moduledoc """
  Checks a credential with one authenticated read against the vendor:

    * Claude setup-tokens: `GET https://api.anthropic.com/v1/models` as a Bearer token (never with `x-api-key`,
      which makes Anthropic 401 OAuth tokens); it spends no quota;
    * Codex `auth.json` access tokens and Enterprise access tokens: `GET https://chatgpt.com/backend-api/wham/usage`,
      the read-only usage endpoint Codex itself calls, with the ChatGPT account id header.  It answers with the
      account's email and plan.
  """
  @behaviour Console.Devboxes.AgentCredentials.Verifier

  @anthropic "https://api.anthropic.com/v1/models"
  @chatgpt "https://chatgpt.com/backend-api/wham/usage"

  @impl true
  def verify(:claude_oauth_token, token, meta) do
    Req.get(@anthropic,
      headers: [
        {"authorization", "Bearer #{token}"},
        {"anthropic-version", "2023-06-01"},
        {"anthropic-beta", "oauth-2025-04-20"}
      ],
      retry: false,
      receive_timeout: 10_000
    )
    |> result(meta)
  end

  def verify(:codex_chatgpt_auth, bundle, meta) do
    case Jason.decode(bundle) do
      {:ok, %{"tokens" => %{"access_token" => token}}} when is_binary(token) and token != "" ->
        verify(:codex_access_token, token, meta)
      _ -> {:error, "the codex auth.json has no tokens.access_token"}
    end
  end

  def verify(:codex_access_token, token, meta) do
    headers = [{"authorization", "Bearer #{token}"}, {"user-agent", "codex-cli"}] ++ account_header(meta)
    Req.get(@chatgpt, headers: headers, retry: false, receive_timeout: 10_000)
    |> result(meta)
  end

  def verify(kind, _, _), do: {:error, "cannot verify #{kind} credentials"}

  defp account_header(%{"account_id" => id}) when is_binary(id), do: [{"chatgpt-account-id", id}]
  defp account_header(_), do: []

  defp result({:ok, %Req.Response{status: status, body: body}}, meta) when status in 200..299,
    do: {:ok, Map.merge(meta, profile(body))}
  defp result({:ok, %Req.Response{status: status}}, _) when status in [401, 403],
    do: {:error, "the vendor rejected this credential (#{status})"}
  defp result({:ok, %Req.Response{status: status}}, _), do: {:error, "could not verify the credential, the vendor returned #{status}"}
  defp result({:error, err}, _), do: {:error, "could not reach the vendor to verify the credential: #{Exception.message(err)}"}

  defp profile(%{"email" => email} = body), do: %{"email" => email} |> maybe_put("plan", body["plan_type"])
  defp profile(_), do: %{}

  defp maybe_put(map, _, nil), do: map
  defp maybe_put(map, k, v), do: Map.put(map, k, v)
end
