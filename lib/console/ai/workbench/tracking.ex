defmodule Console.AI.Workbench.Tracking do
  @moduledoc """
  OpenTelemetry span names and attributes for workbench job execution.
  """
  alias Console.Schema.WorkbenchJob
  alias Console.AI.Tools.Workbench.{
    Subagent,
    SkillBackfill,
    Notes,
    FunctionCall,
    KubeDrain,
    KubeRequest,
    KubeShell
  }
  alias Console.AI.Tools.Workbench.Canvas, as: CanvasTool
  alias OpentelemetryProcessPropagator.Task, as: TracedTask

  require OpenTelemetry.Tracer

  def with_run(%WorkbenchJob{} = job, fun) when is_function(fun, 0) do
    OpenTelemetry.Tracer.with_span "workbench.run", %{attributes: run_attributes(job)} do
      fun.()
    end
  end

  def with_activity(action, %WorkbenchJob{} = job, fun) when is_function(fun, 0) do
    OpenTelemetry.Tracer.with_span activity_span_name(action), %{attributes: activity_attributes(action, job)} do
      fun.()
    end
  end

  def async_stream(enumerable, fun, opts \\ []) do
    TracedTask.async_stream(enumerable, fun, opts)
  end

  defp run_attributes(%WorkbenchJob{id: id, type: type}) do
    %{
      "workbench.job.id" => id,
      "workbench.job.type" => to_string(type)
    }
  end

  defp activity_span_name(%Subagent{subagent: type}), do: "workbench.activity.subagent.#{type}"
  defp activity_span_name(%SkillBackfill{}), do: "workbench.activity.skill_backfill"
  defp activity_span_name(%CanvasTool{}), do: "workbench.activity.canvas"
  defp activity_span_name(%Notes{}), do: "workbench.activity.notes"
  defp activity_span_name(%FunctionCall{}), do: "workbench.activity.function_call"
  defp activity_span_name(%KubeRequest{}), do: "workbench.activity.kubernetes_request"
  defp activity_span_name(%KubeDrain{}), do: "workbench.activity.kubernetes_drain"
  defp activity_span_name(%KubeShell{}), do: "workbench.activity.kubernetes_exec"
  defp activity_span_name(_), do: "workbench.activity"

  defp activity_attributes(action, %WorkbenchJob{id: id}) do
    Map.merge(%{"workbench.job.id" => id}, action_attributes(action))
  end

  defp action_attributes(%Subagent{subagent: type}), do: %{"workbench.activity.kind" => "subagent", "workbench.subagent" => to_string(type)}
  defp action_attributes(%SkillBackfill{}), do: %{"workbench.activity.kind" => "skill_backfill"}
  defp action_attributes(%CanvasTool{}), do: %{"workbench.activity.kind" => "canvas"}
  defp action_attributes(%Notes{}), do: %{"workbench.activity.kind" => "notes"}
  defp action_attributes(%FunctionCall{}), do: %{"workbench.activity.kind" => "function_call"}
  defp action_attributes(%KubeRequest{}), do: %{"workbench.activity.kind" => "kubernetes_request"}
  defp action_attributes(%KubeDrain{}), do: %{"workbench.activity.kind" => "kubernetes_drain"}
  defp action_attributes(%KubeShell{}), do: %{"workbench.activity.kind" => "kubernetes_exec"}
  defp action_attributes(_), do: %{}
end
