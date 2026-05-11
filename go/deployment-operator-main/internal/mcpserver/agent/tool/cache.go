package tool

import (
	"strings"

	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

var (
	cachedAgentRun *client.AgentRunFragment
)

func HasCachedTodos() bool {
	return cachedAgentRun != nil && cachedAgentRun.Todos != nil && len(cachedAgentRun.Todos) > 0
}

func GetCachedTodos() []*client.AgentTodoFragment {
	if cachedAgentRun == nil {
		return nil
	}

	return cachedAgentRun.Todos
}

func EqualsCachedTodos(todos []*client.AgentTodoAttributes) bool {
	if cachedAgentRun == nil || cachedAgentRun.Todos == nil {
		return false
	}

	if len(cachedAgentRun.Todos) != len(todos) {
		return false
	}

	for i := 0; i < len(todos); i++ {
		if cachedAgentRun.Todos[i].Title != todos[i].Title {
			return false
		}
	}

	return true
}

func UpdateCachedTodos(todos []*client.AgentTodoFragment) {
	if cachedAgentRun == nil {
		cachedAgentRun = &client.AgentRunFragment{}
	}

	cachedAgentRun.Todos = todos
}

func MarkCachedTodoItem(title string, done bool) bool {
	if !done {
		return false
	}

	for i, todo := range cachedAgentRun.Todos {
		if strings.Contains(todo.Title, title) {
			cachedAgentRun.Todos[i].Done = lo.ToPtr(true)
			return true
		}
	}

	return false
}

func MarkCachedTodoItems(items []*client.AgentTodoFragment) {
	if cachedAgentRun == nil || cachedAgentRun.Todos == nil {
		return
	}

	for _, item := range items {
		MarkCachedTodoItem(item.Title, *item.Done)
	}
}
