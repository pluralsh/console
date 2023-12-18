// Code generated by mockery v2.38.0. DO NOT EDIT.

package mocks

import (
	context "context"

	gqlgencclient "github.com/Yamashou/gqlgenc/client"
	gqlclient "github.com/pluralsh/console-client-go"

	mock "github.com/stretchr/testify/mock"

	v1alpha1 "github.com/pluralsh/console/controller/api/v1alpha1"
)

// ConsoleClient is an autogenerated mock type for the ConsoleClient type
type ConsoleClient struct {
	mock.Mock
}

// CreateCluster provides a mock function with given fields: attrs
func (_m *ConsoleClient) CreateCluster(attrs gqlclient.ClusterAttributes) (*gqlclient.ClusterFragment, error) {
	ret := _m.Called(attrs)

	if len(ret) == 0 {
		panic("no return value specified for CreateCluster")
	}

	var r0 *gqlclient.ClusterFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(gqlclient.ClusterAttributes) (*gqlclient.ClusterFragment, error)); ok {
		return rf(attrs)
	}
	if rf, ok := ret.Get(0).(func(gqlclient.ClusterAttributes) *gqlclient.ClusterFragment); ok {
		r0 = rf(attrs)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(gqlclient.ClusterAttributes) error); ok {
		r1 = rf(attrs)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CreateProvider provides a mock function with given fields: ctx, attributes, options
func (_m *ConsoleClient) CreateProvider(ctx context.Context, attributes gqlclient.ClusterProviderAttributes, options ...gqlgencclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error) {
	_va := make([]interface{}, len(options))
	for _i := range options {
		_va[_i] = options[_i]
	}
	var _ca []interface{}
	_ca = append(_ca, ctx, attributes)
	_ca = append(_ca, _va...)
	ret := _m.Called(_ca...)

	if len(ret) == 0 {
		panic("no return value specified for CreateProvider")
	}

	var r0 *gqlclient.ClusterProviderFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, gqlclient.ClusterProviderAttributes, ...gqlgencclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error)); ok {
		return rf(ctx, attributes, options...)
	}
	if rf, ok := ret.Get(0).(func(context.Context, gqlclient.ClusterProviderAttributes, ...gqlgencclient.HTTPRequestOption) *gqlclient.ClusterProviderFragment); ok {
		r0 = rf(ctx, attributes, options...)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterProviderFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, gqlclient.ClusterProviderAttributes, ...gqlgencclient.HTTPRequestOption) error); ok {
		r1 = rf(ctx, attributes, options...)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CreateRepository provides a mock function with given fields: url, privateKey, passphrase, username, password
func (_m *ConsoleClient) CreateRepository(url string, privateKey *string, passphrase *string, username *string, password *string) (*gqlclient.CreateGitRepository, error) {
	ret := _m.Called(url, privateKey, passphrase, username, password)

	if len(ret) == 0 {
		panic("no return value specified for CreateRepository")
	}

	var r0 *gqlclient.CreateGitRepository
	var r1 error
	if rf, ok := ret.Get(0).(func(string, *string, *string, *string, *string) (*gqlclient.CreateGitRepository, error)); ok {
		return rf(url, privateKey, passphrase, username, password)
	}
	if rf, ok := ret.Get(0).(func(string, *string, *string, *string, *string) *gqlclient.CreateGitRepository); ok {
		r0 = rf(url, privateKey, passphrase, username, password)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.CreateGitRepository)
		}
	}

	if rf, ok := ret.Get(1).(func(string, *string, *string, *string, *string) error); ok {
		r1 = rf(url, privateKey, passphrase, username, password)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CreateService provides a mock function with given fields: clusterId, attributes
func (_m *ConsoleClient) CreateService(clusterId *string, attributes gqlclient.ServiceDeploymentAttributes) (*gqlclient.ServiceDeploymentFragment, error) {
	ret := _m.Called(clusterId, attributes)

	if len(ret) == 0 {
		panic("no return value specified for CreateService")
	}

	var r0 *gqlclient.ServiceDeploymentFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(*string, gqlclient.ServiceDeploymentAttributes) (*gqlclient.ServiceDeploymentFragment, error)); ok {
		return rf(clusterId, attributes)
	}
	if rf, ok := ret.Get(0).(func(*string, gqlclient.ServiceDeploymentAttributes) *gqlclient.ServiceDeploymentFragment); ok {
		r0 = rf(clusterId, attributes)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ServiceDeploymentFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(*string, gqlclient.ServiceDeploymentAttributes) error); ok {
		r1 = rf(clusterId, attributes)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// DeleteCluster provides a mock function with given fields: id
func (_m *ConsoleClient) DeleteCluster(id string) (*gqlclient.ClusterFragment, error) {
	ret := _m.Called(id)

	if len(ret) == 0 {
		panic("no return value specified for DeleteCluster")
	}

	var r0 *gqlclient.ClusterFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*gqlclient.ClusterFragment, error)); ok {
		return rf(id)
	}
	if rf, ok := ret.Get(0).(func(string) *gqlclient.ClusterFragment); ok {
		r0 = rf(id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// DeleteProvider provides a mock function with given fields: ctx, id, options
func (_m *ConsoleClient) DeleteProvider(ctx context.Context, id string, options ...gqlgencclient.HTTPRequestOption) error {
	_va := make([]interface{}, len(options))
	for _i := range options {
		_va[_i] = options[_i]
	}
	var _ca []interface{}
	_ca = append(_ca, ctx, id)
	_ca = append(_ca, _va...)
	ret := _m.Called(_ca...)

	if len(ret) == 0 {
		panic("no return value specified for DeleteProvider")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, ...gqlgencclient.HTTPRequestOption) error); ok {
		r0 = rf(ctx, id, options...)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteRepository provides a mock function with given fields: id
func (_m *ConsoleClient) DeleteRepository(id string) error {
	ret := _m.Called(id)

	if len(ret) == 0 {
		panic("no return value specified for DeleteRepository")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteService provides a mock function with given fields: serviceId
func (_m *ConsoleClient) DeleteService(serviceId string) error {
	ret := _m.Called(serviceId)

	if len(ret) == 0 {
		panic("no return value specified for DeleteService")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(serviceId)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// GetCluster provides a mock function with given fields: id
func (_m *ConsoleClient) GetCluster(id *string) (*gqlclient.ClusterFragment, error) {
	ret := _m.Called(id)

	if len(ret) == 0 {
		panic("no return value specified for GetCluster")
	}

	var r0 *gqlclient.ClusterFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(*string) (*gqlclient.ClusterFragment, error)); ok {
		return rf(id)
	}
	if rf, ok := ret.Get(0).(func(*string) *gqlclient.ClusterFragment); ok {
		r0 = rf(id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(*string) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetClusterByHandle provides a mock function with given fields: handle
func (_m *ConsoleClient) GetClusterByHandle(handle *string) (*gqlclient.ClusterFragment, error) {
	ret := _m.Called(handle)

	if len(ret) == 0 {
		panic("no return value specified for GetClusterByHandle")
	}

	var r0 *gqlclient.ClusterFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(*string) (*gqlclient.ClusterFragment, error)); ok {
		return rf(handle)
	}
	if rf, ok := ret.Get(0).(func(*string) *gqlclient.ClusterFragment); ok {
		r0 = rf(handle)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(*string) error); ok {
		r1 = rf(handle)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetProvider provides a mock function with given fields: ctx, id, options
func (_m *ConsoleClient) GetProvider(ctx context.Context, id string, options ...gqlgencclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error) {
	_va := make([]interface{}, len(options))
	for _i := range options {
		_va[_i] = options[_i]
	}
	var _ca []interface{}
	_ca = append(_ca, ctx, id)
	_ca = append(_ca, _va...)
	ret := _m.Called(_ca...)

	if len(ret) == 0 {
		panic("no return value specified for GetProvider")
	}

	var r0 *gqlclient.ClusterProviderFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, ...gqlgencclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error)); ok {
		return rf(ctx, id, options...)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, ...gqlgencclient.HTTPRequestOption) *gqlclient.ClusterProviderFragment); ok {
		r0 = rf(ctx, id, options...)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterProviderFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, ...gqlgencclient.HTTPRequestOption) error); ok {
		r1 = rf(ctx, id, options...)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetProviderByCloud provides a mock function with given fields: ctx, cloud, options
func (_m *ConsoleClient) GetProviderByCloud(ctx context.Context, cloud v1alpha1.CloudProvider, options ...gqlgencclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error) {
	_va := make([]interface{}, len(options))
	for _i := range options {
		_va[_i] = options[_i]
	}
	var _ca []interface{}
	_ca = append(_ca, ctx, cloud)
	_ca = append(_ca, _va...)
	ret := _m.Called(_ca...)

	if len(ret) == 0 {
		panic("no return value specified for GetProviderByCloud")
	}

	var r0 *gqlclient.ClusterProviderFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, v1alpha1.CloudProvider, ...gqlgencclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error)); ok {
		return rf(ctx, cloud, options...)
	}
	if rf, ok := ret.Get(0).(func(context.Context, v1alpha1.CloudProvider, ...gqlgencclient.HTTPRequestOption) *gqlclient.ClusterProviderFragment); ok {
		r0 = rf(ctx, cloud, options...)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterProviderFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, v1alpha1.CloudProvider, ...gqlgencclient.HTTPRequestOption) error); ok {
		r1 = rf(ctx, cloud, options...)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetRepository provides a mock function with given fields: url
func (_m *ConsoleClient) GetRepository(url *string) (*gqlclient.GetGitRepository, error) {
	ret := _m.Called(url)

	if len(ret) == 0 {
		panic("no return value specified for GetRepository")
	}

	var r0 *gqlclient.GetGitRepository
	var r1 error
	if rf, ok := ret.Get(0).(func(*string) (*gqlclient.GetGitRepository, error)); ok {
		return rf(url)
	}
	if rf, ok := ret.Get(0).(func(*string) *gqlclient.GetGitRepository); ok {
		r0 = rf(url)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.GetGitRepository)
		}
	}

	if rf, ok := ret.Get(1).(func(*string) error); ok {
		r1 = rf(url)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetService provides a mock function with given fields: clusterID, serviceName
func (_m *ConsoleClient) GetService(clusterID string, serviceName string) (*gqlclient.ServiceDeploymentExtended, error) {
	ret := _m.Called(clusterID, serviceName)

	if len(ret) == 0 {
		panic("no return value specified for GetService")
	}

	var r0 *gqlclient.ServiceDeploymentExtended
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string) (*gqlclient.ServiceDeploymentExtended, error)); ok {
		return rf(clusterID, serviceName)
	}
	if rf, ok := ret.Get(0).(func(string, string) *gqlclient.ServiceDeploymentExtended); ok {
		r0 = rf(clusterID, serviceName)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ServiceDeploymentExtended)
		}
	}

	if rf, ok := ret.Get(1).(func(string, string) error); ok {
		r1 = rf(clusterID, serviceName)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetServices provides a mock function with given fields:
func (_m *ConsoleClient) GetServices() ([]*gqlclient.ServiceDeploymentBaseFragment, error) {
	ret := _m.Called()

	if len(ret) == 0 {
		panic("no return value specified for GetServices")
	}

	var r0 []*gqlclient.ServiceDeploymentBaseFragment
	var r1 error
	if rf, ok := ret.Get(0).(func() ([]*gqlclient.ServiceDeploymentBaseFragment, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() []*gqlclient.ServiceDeploymentBaseFragment); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*gqlclient.ServiceDeploymentBaseFragment)
		}
	}

	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// IsClusterDeleting provides a mock function with given fields: id
func (_m *ConsoleClient) IsClusterDeleting(id *string) bool {
	ret := _m.Called(id)

	if len(ret) == 0 {
		panic("no return value specified for IsClusterDeleting")
	}

	var r0 bool
	if rf, ok := ret.Get(0).(func(*string) bool); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Get(0).(bool)
	}

	return r0
}

// IsClusterExisting provides a mock function with given fields: id
func (_m *ConsoleClient) IsClusterExisting(id *string) bool {
	ret := _m.Called(id)

	if len(ret) == 0 {
		panic("no return value specified for IsClusterExisting")
	}

	var r0 bool
	if rf, ok := ret.Get(0).(func(*string) bool); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Get(0).(bool)
	}

	return r0
}

// IsProviderDeleting provides a mock function with given fields: ctx, id
func (_m *ConsoleClient) IsProviderDeleting(ctx context.Context, id string) bool {
	ret := _m.Called(ctx, id)

	if len(ret) == 0 {
		panic("no return value specified for IsProviderDeleting")
	}

	var r0 bool
	if rf, ok := ret.Get(0).(func(context.Context, string) bool); ok {
		r0 = rf(ctx, id)
	} else {
		r0 = ret.Get(0).(bool)
	}

	return r0
}

// IsProviderExists provides a mock function with given fields: ctx, id
func (_m *ConsoleClient) IsProviderExists(ctx context.Context, id string) bool {
	ret := _m.Called(ctx, id)

	if len(ret) == 0 {
		panic("no return value specified for IsProviderExists")
	}

	var r0 bool
	if rf, ok := ret.Get(0).(func(context.Context, string) bool); ok {
		r0 = rf(ctx, id)
	} else {
		r0 = ret.Get(0).(bool)
	}

	return r0
}

// ListClusters provides a mock function with given fields:
func (_m *ConsoleClient) ListClusters() (*gqlclient.ListClusters, error) {
	ret := _m.Called()

	if len(ret) == 0 {
		panic("no return value specified for ListClusters")
	}

	var r0 *gqlclient.ListClusters
	var r1 error
	if rf, ok := ret.Get(0).(func() (*gqlclient.ListClusters, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() *gqlclient.ListClusters); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ListClusters)
		}
	}

	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListRepositories provides a mock function with given fields:
func (_m *ConsoleClient) ListRepositories() (*gqlclient.ListGitRepositories, error) {
	ret := _m.Called()

	if len(ret) == 0 {
		panic("no return value specified for ListRepositories")
	}

	var r0 *gqlclient.ListGitRepositories
	var r1 error
	if rf, ok := ret.Get(0).(func() (*gqlclient.ListGitRepositories, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() *gqlclient.ListGitRepositories); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ListGitRepositories)
		}
	}

	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateCluster provides a mock function with given fields: id, attrs
func (_m *ConsoleClient) UpdateCluster(id string, attrs gqlclient.ClusterUpdateAttributes) (*gqlclient.ClusterFragment, error) {
	ret := _m.Called(id, attrs)

	if len(ret) == 0 {
		panic("no return value specified for UpdateCluster")
	}

	var r0 *gqlclient.ClusterFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(string, gqlclient.ClusterUpdateAttributes) (*gqlclient.ClusterFragment, error)); ok {
		return rf(id, attrs)
	}
	if rf, ok := ret.Get(0).(func(string, gqlclient.ClusterUpdateAttributes) *gqlclient.ClusterFragment); ok {
		r0 = rf(id, attrs)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(string, gqlclient.ClusterUpdateAttributes) error); ok {
		r1 = rf(id, attrs)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateComponents provides a mock function with given fields: id, components, errs
func (_m *ConsoleClient) UpdateComponents(id string, components []*gqlclient.ComponentAttributes, errs []*gqlclient.ServiceErrorAttributes) error {
	ret := _m.Called(id, components, errs)

	if len(ret) == 0 {
		panic("no return value specified for UpdateComponents")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(string, []*gqlclient.ComponentAttributes, []*gqlclient.ServiceErrorAttributes) error); ok {
		r0 = rf(id, components, errs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateProvider provides a mock function with given fields: ctx, id, attributes, options
func (_m *ConsoleClient) UpdateProvider(ctx context.Context, id string, attributes gqlclient.ClusterProviderUpdateAttributes, options ...gqlgencclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error) {
	_va := make([]interface{}, len(options))
	for _i := range options {
		_va[_i] = options[_i]
	}
	var _ca []interface{}
	_ca = append(_ca, ctx, id, attributes)
	_ca = append(_ca, _va...)
	ret := _m.Called(_ca...)

	if len(ret) == 0 {
		panic("no return value specified for UpdateProvider")
	}

	var r0 *gqlclient.ClusterProviderFragment
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, gqlclient.ClusterProviderUpdateAttributes, ...gqlgencclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error)); ok {
		return rf(ctx, id, attributes, options...)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, gqlclient.ClusterProviderUpdateAttributes, ...gqlgencclient.HTTPRequestOption) *gqlclient.ClusterProviderFragment); ok {
		r0 = rf(ctx, id, attributes, options...)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.ClusterProviderFragment)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, gqlclient.ClusterProviderUpdateAttributes, ...gqlgencclient.HTTPRequestOption) error); ok {
		r1 = rf(ctx, id, attributes, options...)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateRepository provides a mock function with given fields: id, attrs
func (_m *ConsoleClient) UpdateRepository(id string, attrs gqlclient.GitAttributes) (*gqlclient.UpdateGitRepository, error) {
	ret := _m.Called(id, attrs)

	if len(ret) == 0 {
		panic("no return value specified for UpdateRepository")
	}

	var r0 *gqlclient.UpdateGitRepository
	var r1 error
	if rf, ok := ret.Get(0).(func(string, gqlclient.GitAttributes) (*gqlclient.UpdateGitRepository, error)); ok {
		return rf(id, attrs)
	}
	if rf, ok := ret.Get(0).(func(string, gqlclient.GitAttributes) *gqlclient.UpdateGitRepository); ok {
		r0 = rf(id, attrs)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*gqlclient.UpdateGitRepository)
		}
	}

	if rf, ok := ret.Get(1).(func(string, gqlclient.GitAttributes) error); ok {
		r1 = rf(id, attrs)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateService provides a mock function with given fields: serviceId, attributes
func (_m *ConsoleClient) UpdateService(serviceId string, attributes gqlclient.ServiceUpdateAttributes) error {
	ret := _m.Called(serviceId, attributes)

	if len(ret) == 0 {
		panic("no return value specified for UpdateService")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(string, gqlclient.ServiceUpdateAttributes) error); ok {
		r0 = rf(serviceId, attributes)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// NewConsoleClient creates a new instance of ConsoleClient. It also registers a testing interface on the mock and a cleanup function to assert the mocks expectations.
// The first argument is typically a *testing.T value.
func NewConsoleClient(t interface {
	mock.TestingT
	Cleanup(func())
}) *ConsoleClient {
	mock := &ConsoleClient{}
	mock.Mock.Test(t)

	t.Cleanup(func() { mock.AssertExpectations(t) })

	return mock
}
