defmodule Console.Deployments.Deprecations.Checker do
  import Console.Deployments.Ecto.Validations
  alias Console.Deployments.Deprecations.Table
  alias Console.Schema.{ServiceComponent, Cluster}

  @doc """
  Determines whether an api has been deprecated, and whether it is blocking upgrade
  """
  @spec check(ServiceComponent.t, Cluster.t) :: {Table.Entry.t, boolean} | :pass
  def check(%ServiceComponent{} = component, %Cluster{version: vsn, current_version: cvsn}) do
    with %Table.Entry{} = entry <- Table.fetch(component),
         {true, blocking} <- eligible(cvsn || vsn, entry) do
      {entry, blocking}
    else
      _ -> :pass
    end
  end

  def eligible(vsn, %Table.Entry{deprecated_in: deprecated, removed_in: removed}) when is_binary(vsn) do
    with {:ok, vsn} <- Version.parse(clean_version(vsn)),
         {:ok, deprecated} <- Version.parse(clean_version(deprecated)),
         {:ok, removed} <- Version.parse(clean_version(removed)),
      do: {at_least(vsn, deprecated), at_least(bump_minor(vsn), removed)}
  end
  def eligible(_, _), do: :pass
end
