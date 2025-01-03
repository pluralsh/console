defprotocol Console.AI.Evidence do
  @spec generate(term) :: {:ok, Console.AI.Provider.history} | :ok
  def generate(struct)


  @spec insight(term) :: Console.Schema.AiInsight.t | nil
  def insight(struct)

  def preload(term)

  @spec custom(term) :: boolean
  def custom(term)
end

defimpl Console.AI.Evidence, for: Any do
  def generate(_), do: :ok

  def preload(_), do: :ok

  def insight(_), do: nil

  def custom(_), do: false
end
