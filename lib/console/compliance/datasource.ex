defmodule Console.Compliance.Datasource do
  @moduledoc """
  Behaviour defining a datasource for compliance reports.
  """
  @callback stream() :: Enumerable.t
end
