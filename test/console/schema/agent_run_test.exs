defmodule Console.Schema.AgentRunTest do
  use Console.DataCase, async: true

  alias Console.Schema.AgentRun
  import Console.Schema.AgentRun, only: [is_terminal: 1]

  test "identifies terminal statuses" do
    assert terminal?(:successful)
    assert terminal?(:failed)
    assert terminal?(:cancelled)
    refute terminal?(:pending)
    refute terminal?(:running)
  end

  test "review mode rejects followup runs" do
    changeset =
      %AgentRun{
        status: :pending,
        prompt: "review the pull request",
        repository: "https://github.com/pluralsh/console.git",
        runtime_id: Ecto.UUID.generate(),
        user_id: Ecto.UUID.generate(),
        mode: :write
      }
      |> AgentRun.changeset(%{mode: :review, followup: true})

    assert "cannot be enabled in review mode" in errors_on(changeset).followup
  end

  defp terminal?(status) when is_terminal(status), do: true
  defp terminal?(_), do: false
end
