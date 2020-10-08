defmodule Prometheus.Response, do: defstruct [:status, :data]
defmodule Prometheus.Data, do: defstruct [:resultType, :result]
defmodule Prometheus.Result, do: defstruct [:metric, :values]