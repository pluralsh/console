defmodule Console.Hydra.Client do
  require Logger
  alias Console.Schema.{User}

  defmodule Response, do: defstruct [:redirect_to]
  defmodule Client do
    defstruct [
      :client_id,
      :client_secret,
      :client_uri,
      :redirect_uris,
      :client_name,
      :logo_uri
    ]
  end

  defmodule LoginRequest do
    defstruct [
      :client,
      :oidc_context,
      :requested_scope,
      :subject
    ]
  end

  defmodule ConsentRequest do
    defstruct [
      :client,
      :oidc_context,
      :requested_scope,
      :subject,
      :skip
    ]
  end

  defmodule Configuration do
    defstruct [
      :issuer,
      :authorization_endpoint,
      :token_endpoint,
      :jwks_uri,
      :userinfo_endpoint
    ]
  end


  def get_configuration() do
    public_url("/.well-known/openid-configuration")
    |> HTTPoison.get(headers())
    |> handle_response(%Configuration{})
  end

  def get_client(id) do
    admin_url("/clients/#{id}")
    |> HTTPoison.get(headers())
    |> handle_response(%Client{})
  end

  def create_client(attrs) do
    admin_url("/clients")
    |> HTTPoison.post(Jason.encode!(attrs), headers())
    |> handle_response(%Client{})
  end

  def update_client(client_id, attrs) do
    admin_url("/clients/#{client_id}")
    |> HTTPoison.put(Jason.encode!(attrs), headers())
    |> handle_response(%Client{})
  end

  def delete_client(client_id) do
    admin_url("/clients/#{client_id}")
    |> HTTPoison.delete(headers())
    |> case do
      {:ok, %{status_code: 204}} -> :ok
      error ->
        Logger.error "Failed to delete hydra client: #{inspect(error)}"
        {:error, :unauthorized}
    end
  end

  def get_login(challenge) do
    admin_url("/oauth2/auth/requests/login?login_challenge=#{challenge}")
    |> HTTPoison.get(headers())
    |> handle_response(%LoginRequest{client: %Client{}})
  end

  def accept_login(challenge, user) do
    body = Jason.encode!(%{subject: user.id, remember: false})
    admin_url("/oauth2/auth/requests/login/accept?login_challenge=#{challenge}")
    |> HTTPoison.put(body, headers())
    |> handle_response(%Response{})
  end

  def reject_login(challenge) do
    admin_url("/oauth2/auth/requests/login/reject?login_challenge=#{challenge}")
    |> HTTPoison.put("{}", headers())
    |> handle_response(%Response{})
  end

  def get_consent(challenge) do
    admin_url("/oauth2/auth/requests/consent?consent_challenge=#{challenge}")
    |> HTTPoison.get(headers())
    |> handle_response(%ConsentRequest{client: %Client{}})
  end

  def accept_consent(user, challenge, scopes) do
    body = Jason.encode!(%{
      grant_scope: scopes,
      remember: false,
      session: %{
        id_token: user_details(user),
        access_token: user_details(user)
      }
    })
    admin_url("/oauth2/auth/requests/consent/accept?consent_challenge=#{challenge}")
    |> HTTPoison.put(body, headers())
    |> handle_response(%Response{})
  end

  def reject_consent(challenge) do
    admin_url("/oauth2/auth/requests/consent/accept?consent_challenge=#{challenge}")
    |> HTTPoison.put("{}", headers())
    |> handle_response(%Response{})
  end

  defp handle_response({:ok, %{status_code: code, body: body}}, type) when code in 200..299,
    do: {:ok, Poison.decode!(body, as: type)}
  defp handle_response(error, _) do
    Logger.error "Failed to call hydra: #{inspect(error)}"
    {:error, hydra_error(error)}
  end

  defp user_details(user) do
    %{
      groups: user_groups(user),
      admin: admin?(user),
      profile: user.profile,
      name: user.name,
      email: user.email
    }
  end

  defp admin?(%User{roles: %{admin: true}}), do: true
  defp admin?(_), do: false

  defp user_groups(%User{groups: groups}) when is_list(groups),
    do: Enum.map(groups, & &1.name)
  defp user_groups(_), do: []

  defp admin_url(path), do: "#{conf(:hydra_admin)}#{path}"

  defp public_url(path), do: "#{conf(:hydra_public)}#{path}"

  defp conf(key), do: Console.conf(__MODULE__)[key]

  defp hydra_error({:error, _}), do: "internal network error"
  defp hydra_error({:ok, %HTTPoison.Response{status_code: code, body: body}}),
    do: "hydra error: code=#{code}, body=#{body}"

  defp headers(), do: [{"accept", "application/json"}, {"content-type", "application/json"}]
end
