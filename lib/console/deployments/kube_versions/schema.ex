defmodule Console.Deployments.KubeVersions.Changelog do
  @type t :: %__MODULE__{
    version: binary,
    major_changes: [binary],
    breaking_changes: [binary],
    deprecations: [binary],
    removals: [binary],
    features: [binary],
    bug_fixes: [binary],
    api_updates: [binary]
  }

  defstruct [:version, :major_changes, :breaking_changes, :deprecations, :removals, :features, :bug_fixes, :api_updates]

  def new(%{"summary" => summary} = attrs) do
    %__MODULE__{
      version: attrs["version"],
      major_changes: summary["major_changes"],
      breaking_changes: summary["breaking_changes"],
      deprecations: summary["deprecations"],
      removals: summary["removals"],
      features: summary["features"],
      bug_fixes: summary["bug_fixes"],
      api_updates: summary["api_updates"]
    }
  end
end
