package mock_redis

//go:generate mockgen.sh -source "../../redistool/expiring_hash.go" -destination "expiring_hash.go" -package "mock_redis"
//go:generate mockgen.sh -source "../../redistool/expiring_hash_api.go" -destination "expiring_hash_api.go" -package "mock_redis"
//go:generate mockgen.sh -source "../../redistool/expiring_hash_api_set_builder.go" -destination "expiring_hash_api_set_builder.go" -package "mock_redis"
