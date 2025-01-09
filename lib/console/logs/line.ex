defmodule Console.Logs.Line do
  @type t :: %__MODULE__{facets: [%{key: binary, value: binary}]}

  defstruct [:timestamp, :log, :facets]

  def new(map) do
    %__MODULE__{log: map[:log], timestamp: map[:timestamp], facets: map[:facets]}
  end

  def facets(%{} = map), do: Enum.map(map, fn {k, v} -> %{key: k, value: v} end)
  def facets(l) when is_list(l), do: Enum.map(l, fn {k, v} -> %{key: k, value: v} end)

  def flat_map(%{} = map, pref \\ nil) do
    Enum.flat_map(map, fn
      {k, %{} = v} -> flat_map(v, safe_join(pref, k))
      {k, v} when is_binary(v) -> [{safe_join(pref, k), v}]
      _ -> []
    end)
  end

  defp safe_join(nil, suff), do: suff
  defp safe_join(pref, suff), do: "#{pref}.#{suff}"
end
