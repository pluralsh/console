defmodule Console.Deployments.Integrations do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.{ChatConnection, User}

  @type chat_connection_resp :: {:ok, ChatConnection.t} | Console.error
  @type error :: Console.error

  def get_chat_connection!(id), do: Repo.get!(ChatConnection, id)
  def get_chat_connection(id), do: Repo.get(ChatConnection, id)
  def get_chat_connection_by_name!(name), do: Repo.get_by!(ChatConnection, name: name)
  def get_chat_connection_by_name(name), do: Repo.get_by(ChatConnection, name: name)

  @doc """
  Will upsert a chat connection, fails if a user isn't an admin
  """
  @spec upsert_chat_connection(map, User.t) :: chat_connection_resp
  def upsert_chat_connection(%{name: name} = attrs, %User{} = user) do
    case Repo.get_by(ChatConnection, name: name) do
      %ChatConnection{} = conn -> conn
      nil -> %ChatConnection{name: name}
    end
    |> ChatConnection.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Will delete a chat connection, fails if a user isn't an admin
  """
  @spec delete_chat_connection(binary, User.t) :: chat_connection_resp
  def delete_chat_connection(id, %User{} = user) do
    get_chat_connection!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end
end
