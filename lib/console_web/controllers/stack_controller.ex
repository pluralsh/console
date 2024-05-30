defmodule ConsoleWeb.StackController do
  use ConsoleWeb, :controller
  alias Console.Deployments.Stacks.State

  plug :get_actor when action in [:get_tf_state, :update_tf_state, :lock_tf_state, :unlock_tf_state]

  def get_tf_state(conn, %{"stack_id" => id}) do
    case State.get_terraform_state(id, conn.assigns.actor) do
      {:ok, %{state: state}} when is_binary(state) and byte_size(state) > 0 ->
        send_resp(conn, 200, state)
      {:ok, _} -> send_resp(conn, 204, "")
      _ -> send_resp(conn, 403, "Forbidden")
    end
  end

  def update_tf_state(conn, %{"stack_id" => id} = attrs) do
    %{raw_body: state, actor: actor} = conn.assigns

    IO.iodata_to_binary(state)
    |> State.update_terraform_state(attrs["ID"], id, actor)
    |> handle_resp(conn)
  end

  def lock_tf_state(conn, %{"stack_id" => id} = lock) do
    Map.new(lock, fn {k, v} -> {String.downcase(k), v} end)
    |> State.lock_terraform_state(id, conn.assigns.actor)
    |> handle_resp(conn)
  end

  def unlock_tf_state(conn, %{"stack_id" => id}) do
    State.unlock_terraform_state(id, conn.assigns.actor)
    |> handle_resp(conn)
  end

  defp handle_resp({:error, {:locked, lock}}, conn) do
    put_resp_header(conn, "content-type", "application/json")
    |> send_resp(423, Jason.encode!(State.lock(lock)))
  end

  defp handle_resp({:error, :forbidden}, conn), do: send_resp(conn, 403, "Forbidden")
  defp handle_resp({:error, %Ecto.Changeset{} = changeset}, conn),
    do: send_resp(conn, 400, Console.GraphQl.Helpers.resolve_changeset(changeset) |> Enum.join(", "))
  defp handle_resp({:error, err}, conn), do: send_resp(conn, 400, inspect(err))

  defp handle_resp({:ok, _}, conn), do: send_resp(conn, 200, "")

  defp get_actor(conn, _) do
    with {_, token} <- Plug.BasicAuth.parse_basic_auth(conn),
         %{} = actor <- Console.authed_user(token) do
      assign(conn, :actor, actor)
    else
      _ -> send_resp(conn, 403, "Forbidden") |> halt()
    end
  end
end
