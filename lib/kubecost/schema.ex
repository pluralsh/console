defmodule Kubecost.Entry do
  defstruct [
    :minutes,
    :cpu_cost,
    :cpu_efficiency,
    :efficiency,
    :gpu_cost,
    :network_cost,
    :pv_cost,
    :ram_cost,
    :ram_efficiency,
    :total_cost,
    :shared_cost
  ]

  def build(attrs) do
    %__MODULE__{
      minutes: attrs["minutes"],
      cpu_cost: attrs["cpuCost"],
      cpu_efficiency: attrs["cpuEfficiency"],
      efficiency: attrs["efficiency"],
      gpu_cost: attrs["gpuCost"],
      network_cost: attrs["networkCost"],
      pv_cost: attrs["pvCost"],
      ram_cost: attrs["ramCost"],
      ram_efficiency: attrs["ramEfficiency"],
      total_cost: attrs["totalCost"],
      shared_cost: attrs["sharedCost"]
    }
  end
end
