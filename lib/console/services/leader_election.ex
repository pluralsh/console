defmodule Console.Services.LeaderElection do
  use Console.Services.Base
  alias Console.Schema.Leader

  @type error :: {:error, term}
  @type leader_resp :: {:ok, Leader.t} | error

  @spec get(binary) :: Leader.t | nil
  def get(name), do: Console.Repo.get_by(Leader, name: name)

  @spec atomic_get(binary) :: Leader.t | nil
  def atomic_get(name), do: Console.Repo.get_by(Leader.with_lock(), name: name)

  @doc """
  Wipes the leader record if `ref` owns `name`, otherwise fails
  """
  @spec clear(term, binary) :: leader_resp
  def clear(ref, name) do
    start_transaction()
    |> add_operation(:fetch, fn _ ->
      case atomic_get(name) do
        %Leader{ref: ^ref} = l -> {:ok, l}
        _ -> {:error, :following}
      end
    end)
    |> add_operation(:update, fn %{fetch: l} -> Console.Repo.delete(l) end)
    |> execute(extract: :update)
  end

  @doc """
  Locks the record for `name` then if either `ref` currently owns it or it does not exist, upserts
  the record with a current heartbeat.

  If `ref` does not own the record, it fails
  """
  @spec elect(term, binary) :: leader_resp
  def elect(ref, name) do
    start_transaction()
    |> add_operation(:fetch, fn _ ->
      case atomic_get(name) do
        %Leader{ref: ^ref} = leader -> {:ok, leader}
        %Leader{} = leader -> check_hearbeat(leader)
        nil -> {:ok, %Leader{name: name}}
      end
    end)
    |> add_operation(:update, fn %{fetch: fetch} ->
      fetch
      |> Leader.changeset(%{ref: ref, heartbeat: Timex.now()})
      |> Console.Repo.insert_or_update()
    end)
    |> execute(extract: :update)
  end

  defp check_hearbeat(%Leader{heartbeat: beat} = leader) do
    expired = Timex.now() |> Timex.shift(seconds: -30)
    case Timex.before?(beat, expired) do
      true -> {:ok, leader}
      false -> {:error, :following}
    end
  end
end
