defmodule Loki.Response, do: defstruct [:status, :data]
defmodule Loki.Data, do: defstruct [:resultType, :result]
defmodule Loki.Result, do: defstruct [:metric, :stream, :values]
defmodule Loki.Value, do: defstruct [:timestamp, :value]