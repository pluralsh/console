package service

import (
	"sync"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/containers"
)

var (
	allServices    = containers.NewSet[string]()
	servicePresent = make(map[string][]*console.ServiceDependencyFragment)
	cacheMu        sync.RWMutex
)

func (s *ServiceReconciler) registerDependencies(svc *console.ServiceDeploymentForAgent) {
	cacheMu.Lock()
	defer cacheMu.Unlock()

	// Update or add the service with its latest dependencies
	servicePresent[svc.Name] = svc.Dependencies

	// Sideload dependencies: ensure they exist in the map
	for _, dep := range svc.Dependencies {
		if _, exists := servicePresent[dep.Name]; !exists {
			depSvc, err := s.svcCache.Get(dep.ID)
			if err != nil && depSvc != nil && depSvc.DeletedAt == nil {
				servicePresent[dep.Name] = depSvc.Dependencies
			}
		}
	}
}

// getActiveDependents returns a list of service names that depend on the given service
func (s *ServiceReconciler) getActiveDependents(svcName string) []string {
	cacheMu.RLock()
	defer cacheMu.RUnlock()

	var dependents []string
	for name, deps := range servicePresent {
		if name == svcName {
			continue
		}
		for _, d := range deps {
			if d.Name == svcName {
				// check if the service is still in the cache
				// it could have been detached
				if allServices.Has(name) {
					dependents = append(dependents, name)
					break
				}
			}
		}
	}

	return dependents
}

// unregisterDependencies removes a service from the map
func unregisterDependencies(svc *console.ServiceDeploymentForAgent) {
	cacheMu.Lock()
	defer cacheMu.Unlock()
	delete(servicePresent, svc.Name)
}

func updateAllServices(newSet containers.Set[string]) {
	cacheMu.Lock()
	defer cacheMu.Unlock()
	// Add all newly seen services
	allServices = allServices.Union(newSet)
	// Remove any that are no longer present
	allServices = allServices.Intersect(newSet)
}
