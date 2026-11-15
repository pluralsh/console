defmodule ConsoleWeb.OIDCController do
  use ConsoleWeb, :controller
  alias Console.WorkloadIdentity
  alias Console.Schema.WorkloadIdentityIssuer

  def discovery(conn, %{"scope_type" => type, "scope_id" => id}) do
    with %WorkloadIdentityIssuer{} = issuer <- WorkloadIdentity.get_enabled_issuer(type, id) do
      conn
      |> put_resp_header("cache-control", "public, max-age=300")
      |> json(WorkloadIdentity.discovery(issuer))
    else
      _ -> not_found(conn)
    end
  end

  def jwks(conn, %{"scope_type" => type, "scope_id" => id}) do
    with %WorkloadIdentityIssuer{} = issuer <- WorkloadIdentity.get_enabled_issuer(type, id) do
      conn
      |> put_resp_header("cache-control", "public, max-age=300")
      |> json(WorkloadIdentity.jwks(issuer))
    else
      _ -> not_found(conn)
    end
  end

  defp not_found(conn) do
    conn
    |> put_status(404)
    |> json(%{error: "not found"})
  end
end
