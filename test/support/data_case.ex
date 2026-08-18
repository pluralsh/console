defmodule Console.DataCase do
  @moduledoc """
  This module defines the setup for tests requiring
  access to the application's data layer.

  You may define functions here to be used as helpers in
  your tests.

  Finally, if the test case interacts with the database,
  it cannot be async. For this reason, every test runs
  inside a transaction which is reset at the beginning
  of the test unless the test case is marked as async.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      alias Console.Repo

      import Ecto
      import Ecto.Changeset
      import Ecto.Query
      import Console.DataCase
      import Console.Factory
      import Console.TestHelpers
    end
  end

  setup tags do
    owner = Ecto.Adapters.SQL.Sandbox.start_owner!(Console.Repo, shared: not tags[:async])

    on_exit(fn ->
      stop_background_agents()
      Ecto.Adapters.SQL.Sandbox.stop_owner(owner)
    end)

    :ok
  end

  defp stop_background_agents do
    Console.AI.Agents
    |> Registry.select([{{{:workbench_heartbeat, :_}, :"$1", :_}, [], [:"$1"]}])
    |> stop_agents()

    Console.Deployments.Git.Agent.registry()
    |> Registry.select([{{{:git, :_}, :"$1", :_}, [], [:"$1"]}])
    |> stop_agents()

    Console.Deployments.Helm.Agent.registry()
    |> Registry.select([{{{:helm, :_}, :"$1", :_}, [], [:"$1"]}])
    |> stop_agents()
  end

  defp stop_agents(pids) do
    Enum.each(pids, fn pid ->
      if Process.alive?(pid) do
        try do
          GenServer.stop(pid, :normal, 5_000)
        catch
          _, _ -> :ok
        end
      end
    end)
  end

  @doc """
  A helper that transforms changeset errors into a map of messages.

      assert {:error, changeset} = Accounts.create_user(%{password: "short"})
      assert "password is too short" in errors_on(changeset).password
      assert %{password: ["password is too short"]} = errors_on(changeset)

  """
  def errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, opts} ->
      Regex.replace(~r"%{(\w+)}", message, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
