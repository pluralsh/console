package common

import (
	"crypto/sha256"
	"encoding/base32"
	"encoding/json"
)

func HashObject(a any) (string, error) {
	out, err := json.Marshal(a)
	if err != nil {
		return "", err
	}
	sha := sha256.Sum256(out)
	return base32.StdEncoding.EncodeToString(sha[:]), nil
}
