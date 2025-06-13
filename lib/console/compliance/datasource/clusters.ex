defmodule Console.Compliance.Datasource.Clusters do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.{Cluster, PolicyBinding, User, Group}

  @impl Console.Compliance.Datasource
  def stream do
    Cluster.stream()
    |> Cluster.preloaded([:project, read_bindings: [:group, :user], write_bindings: [:group, :user]])
    |> Console.Repo.stream(method: :keyset)
    |> Stream.map(fn c ->
      %{
        cluster: c.handle,
        project: c.project.name,
        version: c.current_version,
        kubelet_version: c.kubelet_version,
        read_users: format_users(c.read_bindings),
        write_users: format_users(c.write_bindings)
      }
    end)
  end

  defp format_users(bindings) do
    bindings
    |> Enum.map(&extract_user/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.map(&format_user/1)
    |> Enum.join(", ")
  end

  defp format_user(%{email: email}) when not is_nil(email), do: email
  defp format_user(%{group_name: name}) when not is_nil(name), do: "group:#{name}"
  defp format_user(_), do: nil

  defp extract_user(%PolicyBinding{user: %User{} = user}) do
    %{email: user.email}
  end
  defp extract_user(%PolicyBinding{group: %Group{} = group}) do
    %{group_name: group.name}
  end
  defp extract_user(_), do: nil
end
