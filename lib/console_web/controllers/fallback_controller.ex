defmodule ConsoleWeb.FallbackController do
  use ConsoleWeb, :controller

  def call(conn, {:error, "forbidden"}), do: call(conn, {:error, :forbidden})

  def call(conn, {:error, :forbidden}) do
    conn
    |> put_status(403)
    |> json(%{error: "forbidden"})
  end

  def call(conn, {:error, %Ecto.Changeset{} = cs}) do
    conn
    |> put_status(422)
    |> json(%{error: Console.GraphQl.Helpers.resolve_changeset(cs)})
  end

  def call(conn, {:error, err}) when is_binary(err) or is_atom(err) do
    conn
    |> put_status(401)
    |> json(%{error: err})
  end

  def call(conn, {:error, _}) do
    conn
    |> put_status(400)
    |> json(%{error: "unknown error"})
  end
end
