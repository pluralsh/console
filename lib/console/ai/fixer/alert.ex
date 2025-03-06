defmodule Console.AI.Fixer.Alert do
  @behaviour Console.AI.Fixer
  use Console.AI.Evidence.Base
  import Console.AI.Fixer.Base
  alias Console.Repo
  alias Console.Schema.Alert

  def prompt(%Alert{} = alert, insight) do
    alert = Repo.preload(alert, [insight: :evidence])

    Enum.concat([
      {:user, """
        We've found the following insight about an alert that is currently firing:

        #{insight}

        The alert itself has basic metadata as follows:

        Title: #{alert.title}
        Description: #{alert.message}
        Severity: #{alert.severity}

        We'd like you to suggest a simple code or configuration change that can fix the issues identified in that insight.
        I'll do my best to list all the needed resources below.
      """}
    ], evidence_prompts(alert.insight))
    |> ok()
  end
end
