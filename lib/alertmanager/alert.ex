defmodule Alertmanager.Alert do
  defstruct [:name, :summary, :description, :annotations, :labels, :starts_at, :status, :fingerprint]

  def build(%{"annotations" => annots, "labels" => labs} = blob) do
    %__MODULE__{
      name: labs["alertname"],
      summary: annots["summary"],
      description: annots["description"],
      labels: labs,
      annotations: annots,
      status: status(blob),
      starts_at: blob["startsAt"],
      fingerprint: blob["fingerprint"]
    }
  end

  defp status(%{"status" => "resolved"}), do: :resolved
  defp status(_), do: :firing
end
