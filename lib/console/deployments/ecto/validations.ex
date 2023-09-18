defmodule Console.Deployments.Ecto.Validations do
  import Ecto.Changeset

  @semver ~r/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/

  def clean_version(vsn) do
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
