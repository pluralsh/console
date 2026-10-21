defmodule Console.AI.Tools.Workbench.Observability.TraceFilters do
  @moduledoc """
  Provider-agnostic trace search filters, compiled by cloud-query into each
  provider's native query language.
  """
  use Console.Schema.Base
  alias Toolquery.{TraceFilters, TraceAttributeFilter}

  embedded_schema do
    field :service,      :string
    field :operation,    :string
    field :duration_min, :string
    field :duration_max, :string
    field :errors_only,  :boolean
    field :trace_id,     :string

    embeds_many :attributes, Attribute, on_replace: :delete, primary_key: false do
      field :name,  :string
      field :value, :string
    end
  end

  @valid ~w(service operation duration_min duration_max errors_only trace_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:attributes, with: &attribute_changeset/2)
  end

  defp attribute_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required([:name, :value])
  end

  def present?(%__MODULE__{} = filters) do
    Enum.any?(@valid, &(Map.get(filters, &1) not in [nil, "", false])) or
      not Enum.empty?(filters.attributes || [])
  end
  def present?(_), do: false

  def to_proto(%__MODULE__{} = filters) do
    %TraceFilters{
      service: filters.service,
      operation: filters.operation,
      duration_min: filters.duration_min,
      duration_max: filters.duration_max,
      errors_only: filters.errors_only,
      trace_id: filters.trace_id,
      attributes: Enum.map(filters.attributes || [], &%TraceAttributeFilter{name: &1.name, value: &1.value})
    }
  end
  def to_proto(_), do: nil
end
