defmodule ConsoleWeb.JWTController do
  use ConsoleWeb, :controller
  alias Console.Deployments.Settings

  def exchange(conn, %{"email" => email, "jwt" => token}) do
    case Settings.exchange_token(token, email) do
      {:ok, jwt} ->
        conn
        |> put_status(:ok)
        |> json(%{access_token: jwt})
      {:error, error} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: error})
    end
  end
end
