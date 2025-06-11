defmodule Console.Compliance.Datasource.Clusters do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.{Cluster, PolicyBinding}

  @impl Console.Compliance.Datasource
  def stream do
    Cluster.stream()
    |> Cluster.with_users()
    |> Cluster.preloaded([:project])
    |> Console.Repo.stream(method: :keyset)
    |> Stream.map(fn c ->
      %{
        cluster: c.handle,
        project: c.project.name,
        version: c.current_version,
        kubelet_version: c.kubelet_version,
        read_users: Enum.map(c.read_bindings, &extract_user/1),
        write_users: Enum.map(c.write_bindings, &extract_user/1)
      }
    end)
  end

  defp extract_user(%PolicyBinding{user: user}) when not is_nil(user) do
    %{
      id: user.id,
      email: user.email
    }
  end
  defp extract_user(%PolicyBinding{group: group}) when not is_nil(group) do
    %{
      group_id: group.id,
      group_name: group.name
    }
  end
  defp extract_user(_), do: nil
end
