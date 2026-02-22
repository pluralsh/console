defmodule Console.ServiceNow.Change do
  @moduledoc """
  Typed struct for ServiceNow Change Management API change records.

  The API returns each field as `{ "display_value": "...", "value": ... }`.
  This struct stores the `.value` for each field (string, number, or boolean).
  """

  # Full schema from Change Management API result - all fields as atoms
  @fields [
    :reason,
    :parent,
    :watch_list,
    :proposed_change,
    :upon_reject,
    :sys_updated_on,
    :type,
    :approval_history,
    :skills,
    :test_plan,
    :number,
    :is_bulk,
    :cab_delegate,
    :requested_by_date,
    :ci_class,
    :state,
    :sys_created_by,
    :knowledge,
    :order,
    :phase,
    :cmdb_ci,
    :delivery_plan,
    :impact,
    :contract,
    :active,
    :work_notes_list,
    :priority,
    :sys_domain_path,
    :cab_recommendation,
    :production_system,
    :rejection_goto,
    :review_date,
    :requested_by,
    :business_duration,
    :group_list,
    :change_plan,
    :approval_set,
    :wf_activity,
    :implementation_plan,
    :universal_request,
    :end_date,
    :short_description,
    :correlation_display,
    :work_start,
    :delivery_task,
    :outside_maintenance_schedule,
    :additional_assignee_list,
    :std_change_producer_version,
    :sys_class_name,
    :service_offering,
    :closed_by,
    :follow_up,
    :review_status,
    :reassignment_count,
    :start_date,
    :assigned_to,
    :variables,
    :sla_due,
    :comments_and_work_notes,
    :escalation,
    :upon_approval,
    :correlation_id,
    :made_sla,
    :backout_plan,
    :conflict_status,
    :task_effective_number,
    :sys_updated_by,
    :opened_by,
    :user_input,
    :sys_created_on,
    :on_hold_task,
    :sys_domain,
    :route_reason,
    :closed_at,
    :review_comments,
    :business_service,
    :time_worked,
    :chg_model,
    :expected_start,
    :opened_at,
    :work_end,
    :phase_state,
    :cab_date,
    :work_notes,
    :close_code,
    :assignment_group,
    :description,
    :on_hold_reason,
    :calendar_duration,
    :close_notes,
    :sys_id,
    :contact_type,
    :cab_required,
    :urgency,
    :scope,
    :company,
    :justification,
    :activity_due,
    :comments,
    :approval,
    :due_date,
    :sys_mod_count,
    :on_hold,
    :sys_tags,
    :conflict_last_run,
    :risk_value,
    :unauthorized,
    :risk,
    :location,
    :category,
    :risk_impact_analysis
  ]

  defstruct @fields

  @type t :: %__MODULE__{}

  @doc """
  Builds a Change struct from a Change Management API result.

  The API returns `result` as a map where each key is a field name and each value is
  `%{"display_value" => ..., "value" => ...}`. This function extracts the `"value"`
  for each known field.
  """
  @spec from_result(map() | nil) :: t() | nil
  def from_result(nil), do: nil

  def from_result(%{} = result) do
    Map.new(@fields, &{&1, extract_value(result["#{&1}"])})
    |> then(&struct(__MODULE__, &1))
  end

  # API returns { "display_value": "...", "value": ... } per field
  defp extract_value(%{"value" => v}), do: normalize_value(v)
  defp extract_value(v) when is_number(v) or is_boolean(v) or is_binary(v), do: v
  defp extract_value(_), do: nil

  defp normalize_value(""), do: nil
  defp normalize_value(v), do: v
end
