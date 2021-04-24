defmodule Console.PubSub.BuildSucceeded, do: use Piazza.PubSub.Event
defmodule Console.PubSub.BuildFailed, do: use Piazza.PubSub.Event
defmodule Console.PubSub.BuildDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.BuildPending, do: use Piazza.PubSub.Event
defmodule Console.PubSub.BuildApproved, do: use Piazza.PubSub.Event
defmodule Console.PubSub.BuildCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.BuildUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.BuildCancelled, do: use Piazza.PubSub.Event

defmodule Console.PubSub.CommandCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.CommandCompleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.UserCreated, do: use Piazza.PubSub.Event
