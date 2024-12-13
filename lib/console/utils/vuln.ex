defmodule Console.Utils.Vuln do
  def grade("LOW"), do: :low
  def grade("MEDIUM"), do: :medium
  def grade("HIGH"), do: :high
  def grade("CRITICAL"), do: :critical
  def grade("L"), do: :low
  def grade("M"), do: :medium
  def grade("H"), do: :high
  def grade(_), do: :none

  def vector("N"), do: :network
  def vector("A"), do: :adjacent
  def vector("L"), do: :local
  def vector("P"), do: :physical

  def requirement("N"), do: :none
  def requirement("R"), do: :required

  def parse_v3_vector("CVSS:" <> rest) do
    [_ | parts] = String.split(rest, "/")
    Enum.map(parts, fn part ->
      case String.split(part, ":") do
        ["AV", v]  -> {:attack_vector, vector(v)}
        ["AC", c]  -> {:attack_complexity, grade(c)}
        ["PR", p]  -> {:privileges_required, grade(p)}
        ["UI", ui] -> {:user_interaction, requirement(ui)}
        ["C", c]   -> {:confidentiality, grade(c)}
        ["I", i]   -> {:integrity, grade(i)}
        ["A", a]   -> {:availability, grade(a)}
        _ -> nil
      end
    end)
    |> Enum.filter(& &1)
    |> Enum.into(%{})
  end
  def parse_v3_vector(_), do: %{}
end
