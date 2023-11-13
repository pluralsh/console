defmodule Console.Deployments.Ecto.Validations do
  import Ecto.Changeset

  @semver ~r/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/

  def at_least(first, second) do
    case Version.compare(first, second) do
      :gt -> true
      :eq -> true
      _ -> false
    end
  end

  def bump_minor(%Version{minor: minor} = vsn), do: %{vsn | minor: minor + 1, patch: 0, pre: []}

  def next_version?(vsn, vsn2) do
    with {:ok, %{major: m, minor: mn}} <- Version.parse(clean_version(vsn)),
         {:ok, %{major: ^m, minor: mn2}} <- Version.parse(clean_version(vsn2)) do
      mn - mn2 <= 1 && mn >= mn2
    else
      _ -> false
    end
  end

  def clean_version(vsn) do
    vsn = String.trim_leading(vsn, "v")
    case Regex.match?(@semver, vsn) do
      true -> "#{vsn}.0"
      _ -> vsn
    end
  end

  def semver(cs, field) do
    validate_change(cs, field, fn ^field, value ->
      case {Regex.match?(@semver, value), Version.parse(value)} do
        {true, _} -> []
        {_, {:ok, _}} -> []
        {_, :error} -> [{field, "must be a valid semver, got #{value}"}]
      end
    end)
  end

  def kubernetes_names(cs, fields) when is_list(fields) do
    Enum.reduce(fields, cs, &kubernetes_name(&2, &1))
  end

  def kubernetes_name(cs, field) do
    validate_format(cs, field, ~r/[a-z][a-z\-]*[a-z]/, message: "#{field} must be a valid kubernetes name")
  end
end
