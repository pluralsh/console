package template

import (
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline"
	"github.com/pluralsh/console/go/polly/luautils"
	lua "github.com/yuin/gopher-lua"
)

func registerLuaFunctions(l *lua.LState) {
	l.SetFuncs(l.G.Global, map[string]lua.LGFunction{
		"k8s_object_meta": luaK8sObjectMeta,
	})
}

func luaK8sObjectMeta(l *lua.LState) int {
	group := l.CheckString(1)
	version := l.CheckString(2)
	kind := l.CheckString(3)
	namespace := l.CheckString(4)
	name := l.CheckString(5)

	meta, err := streamline.LookupObjectMeta(group, version, kind, namespace, name)
	if err != nil {
		l.RaiseError("k8s_object_meta: %s", err.Error())
		return 0
	}

	l.Push(luautils.GoValueToLuaValue(l, meta))
	return 1
}
