package common

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/identity"
	"github.com/samber/lo"
)

// BindingsAttributes translates a list of bindings into API attributes using identity cache.
func BindingsAttributes(bindings []v1alpha1.Binding) ([]*console.PolicyBindingAttributes, error) {
	if bindings == nil {
		return nil, nil
	}

	attrs := make([]*console.PolicyBindingAttributes, 0)
	for _, b := range bindings {
		attr, err := bindingAttributes(b)
		if err != nil {
			return nil, err
		}
		if attr != nil {
			attrs = append(attrs, attr)
		}
	}

	return attrs, nil
}

// bindingAttributes translates a binding into API attributes using identity cache.
// This couldn't be done directly on the binding type to avoid circular imports.
func bindingAttributes(b v1alpha1.Binding) (*console.PolicyBindingAttributes, error) {
	userId := b.UserID
	groupId := b.GroupID

	if userId == nil && b.UserEmail != nil {
		id, err := identity.Cache().GetUserID(*b.UserEmail)
		if err != nil {
			return nil, err
		}
		userId = lo.EmptyableToPtr(id)
	}

	if groupId == nil && b.GroupName != nil {
		id, err := identity.Cache().GetGroupID(*b.GroupName)
		if err != nil {
			return nil, err
		}
		groupId = lo.EmptyableToPtr(id)
	}

	if userId == nil && groupId == nil {
		return nil, nil
	}

	return &console.PolicyBindingAttributes{UserID: userId, GroupID: groupId}, nil
}
