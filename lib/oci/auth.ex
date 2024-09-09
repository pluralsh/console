defmodule Console.OCI.Auth do
  alias Console.Schema.OCIAuth
  alias Console.OCI.Client

  def authenticate(client, prov, auth) when prov in ~w(aws gcp azure)a,
    do: sidecar_auth(client, prov, auth || %{})
  def authenticate(client, :basic, %OCIAuth{basic: %{username: u, password: p}}),
    do: {:ok, Client.with_credentials(client, u, p)}
  def authenticate(client, _, _), do: {:ok, client}

  defp sidecar_auth(%{url: url} = client, prov, auth) do
    Req.post("http://localhost:3000/auth", json: Map.merge(%{
      url: clean_url(url),
      provider: String.upcase("#{prov}")
    }, Console.mapify(auth)), auth: Console.conf(:sidecar_token))
    |> case do
      {:ok, %Req.Response{status: 200, body: %{"username" => u, "password" => p}}} ->
        {:ok, Client.with_credentials(client, u, p)}
      {:ok, %Req.Response{body: b}} -> {:error, "error authenticating to #{url}: #{body(b)}"}
      _ -> {:error, "unknown error authenticating to #{url}"}
    end
  end

  defp clean_url("oci://" <> url), do: url
  defp clean_url(url), do: url

  defp body(b) when is_binary(b), do: b
  defp body(b) when is_map(b), do: Jason.encode!(b)
end
