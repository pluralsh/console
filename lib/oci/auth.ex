defmodule Console.OCI.Auth do
  alias Console.Schema.OCIAuth
  alias Console.OCI.Client

  def authenticate(client, :basic, %OCIAuth{basic: %{username: u, password: p}}),
    do: {:ok, Client.with_credentials(client, u, p)}
  def authenticate(client, _, _), do: {:ok, client}
end
