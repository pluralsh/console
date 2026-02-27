# Supported Liquid Filters

##  `abbrev`
Truncates a string with ellipses.


_Parameters_:

- Max length

- String to truncate




_Example_: `abbrev 5 "hello world"` returns `he...`.



_Implementation_: `github.com/Masterminds/sprig/v3.abbrev`

##  `abbrevboth`
Truncates both sides of a string with ellipses.


_Parameters_:

- Left offset

- Max length

- String to truncate




_Example_: `abbrevboth 5 10 "1234 5678 9123"` returns `...5678...`.



_Implementation_: `github.com/Masterminds/sprig/v3.abbrevboth`

##  `add`
Sums numbers. Accepts two or more inputs.


_Parameters_:

- Number to add

- Number to add

- ...




_Example_: `add 1 2 3` returns `6`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func15`

##  `add1`
Increments by 1.


_Parameters_:

- Number to increment




_Example_: `add1 3` returns `4`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func14`

##  `add1f`
Increments float number by 1.


_Parameters_:

- Float number to increment




_Example_: `add1 3.0` returns `4.0`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func21`

##  `addf`
Sums float numbers. Accepts two or more inputs.


_Parameters_:

- Float number

- Float number

- ...




_Example_: `add 1.1 2.2 3.3` returns `6.6`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func22`

##  `adler32sum`
Computes Adler-32 checksum of a string.


_Parameters_:

- String




_Example_: `adler32sum "Hello world!"`.



_Implementation_: `github.com/Masterminds/sprig/v3.adler32sum`

##  `ago`
Returns duration from current time (`time.Now`) in seconds resolution.


_Parameters_:

- Date




_Example_: `ago .CreatedAt` will return something like `2h34m7s`.



_Implementation_: `github.com/Masterminds/sprig/v3.dateAgo`

##  `all`
Takes a list of values ad returns true if all values are non-empty.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.all`

##  `any`
Takes a list of values ad returns true if any values are non-empty.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.any`

##  `atoi`
Converts a string to an integer.


_Parameters_:

- String to convert






_Implementation_: `github.com/Masterminds/sprig/v3.init.func12`

##  `b32dec`
Decodes string from Base32 format.


_Parameters_:

- String to decode






_Implementation_: `github.com/Masterminds/sprig/v3.base32decode`

##  `b32enc`
Encodes string with Base32 format.


_Parameters_:

- String to encode






_Implementation_: `github.com/Masterminds/sprig/v3.base32encode`

##  `b64dec`
Decodes string from Base64 format.


_Parameters_:

- String to decode






_Implementation_: `github.com/Masterminds/sprig/v3.base64decode`

##  `b64enc`
Encodes string with Base64 format.


_Parameters_:

- String to encode






_Implementation_: `github.com/Masterminds/sprig/v3.base64encode`

##  `base`
Returns the last element of a path.


_Parameters_:

- Path




_Example_: `base "foo/bar/baz"` returns `baz`.



_Implementation_: `path.Base`

##  `bcrypt`
Generates bcrypt hash of a string.


_Parameters_:

- String






_Implementation_: `github.com/Masterminds/sprig/v3.bcrypt`

##  `biggest`







_Implementation_: `github.com/Masterminds/sprig/v3.max`

##  `buildCustomCert`
Allows customizing the certificate. It returns object with PEM-encoded certificate and key. Note that the returned object can be passed to the `genSignedCert` function to sign a certificate using this CA.


_Parameters_:

- Base64 encoded PEM format certificate

- Base64 encoded PEM format private key




_Example_: `$ca := buildCustomCert "base64-encoded-ca-crt" "base64-encoded-ca-key"`



_Implementation_: `github.com/Masterminds/sprig/v3.buildCustomCertificate`

##  `camelcase`
Converts a string from snake_case to camelCase.


_Parameters_:

- String to convert




_Example_: `camelcase "http_server"` returns `HttpServer`.



_Implementation_: `github.com/huandu/xstrings.ToPascalCase`

##  `cat`







_Implementation_: `github.com/Masterminds/sprig/v3.cat`

##  `ceil`
Returns greatest float value greater than or equal to input value.


_Parameters_:

- Input value




_Example_: `ceil 123.001` will return `124.0`.



_Implementation_: `github.com/Masterminds/sprig/v3.ceil`

##  `chunk`







_Implementation_: `github.com/Masterminds/sprig/v3.chunk`

##  `clean`







_Implementation_: `path.Clean`

##  `coalesce`







_Implementation_: `github.com/Masterminds/sprig/v3.coalesce`

##  `compact`
Accepts a list and removes entries with empty values.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.compact`

##  `concat`
Concatenates arbitrary number of lists into one.


_Parameters_:

- List

- ...






_Implementation_: `github.com/Masterminds/sprig/v3.concat`

##  `contains`
Tests if one string is contained inside of another.


_Parameters_:

- Substring

- String




_Example_: `contains "cat" "catch"` returns `true`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func9`

##  `date`
Formats date. See https://pauladamsmith.com/blog/2011/05/go_time.html.


_Parameters_:

- Date layout






_Implementation_: `github.com/Masterminds/sprig/v3.date`

##  `dateInZone`
Same as `date` but with a timezone.


_Parameters_:

- Date layout

- Date to format

- Timezone




_Example_: `dateInZone "2006-01-02" (now) "UTC"`.


_Aliases_: `date_in_zone`\
_Implementation_: `github.com/Masterminds/sprig/v3.dateInZone`

##  `dateModify`
Allows date modifications.


_Parameters_:

- Date modification

- Date




_Example_: `now | dateModify "-1.5h"` will subtract an hour and thirty minutes from the current time.


_Aliases_: `date_modify`\
_Implementation_: `github.com/Masterminds/sprig/v3.dateModify`

##  `decryptAES`
Receives a Base64 string encoded by the AES-256 CBC algorithm and returns the decoded text.


_Parameters_:

- Base64 string encoded by the AES-256 CBC algorithm






_Implementation_: `github.com/Masterminds/sprig/v3.decryptAES`

##  `deepCopy`
Makes deep copy of the value. This includes maps and other structures. It will panic if there is a problem.


_Parameters_:

- Value to copy




_Example_: `dict "a" 1 "b" 2 | deepCopy`.



_Implementation_: `github.com/Masterminds/sprig/v3.deepCopy`

##  `deepEqual`







_Implementation_: `reflect.DeepEqual`

##  `default`







_Implementation_: `github.com/pluralsh/polly/template.dfault`

##  `derivePassword`







_Implementation_: `github.com/Masterminds/sprig/v3.derivePassword`

##  `dict`







_Implementation_: `github.com/Masterminds/sprig/v3.dict`

##  `dig`







_Implementation_: `github.com/Masterminds/sprig/v3.dig`

##  `dir`







_Implementation_: `path.Dir`

##  `div`
Performs integer division.






_Implementation_: `github.com/Masterminds/sprig/v3.init.func17`

##  `divf`
Performs float number division.






_Implementation_: `github.com/Masterminds/sprig/v3.init.func24`

##  `duration`
Formats a given amount of seconds as a `time.Duration`.


_Parameters_:

- Amount of seconds




_Example_: `duration "95"` returns `1m35s`.



_Implementation_: `github.com/Masterminds/sprig/v3.duration`

##  `durationRound`







_Implementation_: `github.com/Masterminds/sprig/v3.durationRound`

##  `empty`
Returns true if given value has the zero value for its type.


_Parameters_:

- Value




_Example_: `empty .Foo`.



_Implementation_: `github.com/Masterminds/sprig/v3.empty`

##  `encryptAES`
Encrypts text with AES-256 CBC and returns a Base64 encoded string.


_Parameters_:

- Secret key

- Text to encrypt




_Example_: `encryptAES "secretkey" "plaintext"`.



_Implementation_: `github.com/Masterminds/sprig/v3.encryptAES`

##  `env`
Reads environment variable.


_Parameters_:

- Environment variable name




_Example_: `env "HOME"`



_Implementation_: `os.Getenv`

##  `expandenv`
Substitutes environment variable in a string.


_Parameters_:

- String to expand




_Example_: `expandenv "Your path is set to $PATH"`



_Implementation_: `os.ExpandEnv`

##  `ext`
Returns file extension.


_Parameters_:

- File path




_Example_: `ext "foo.bar"` will return `"bar"`



_Implementation_: `path.Ext`

##  `fail`
Unconditionally returns an empty string and an error with the specified text. This is useful in scenarios where other conditionals have determined that template rendering should fail.


_Parameters_:

- Error message




_Example_: `fail "Please accept the end user license agreement"`



_Implementation_: `github.com/Masterminds/sprig/v3.init.func26`

##  `first`
Returns head item on a list.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.first`

##  `float64`
Converts to a `float64`


_Parameters_:

- Value to convert, it can be for example an integer or a string






_Implementation_: `github.com/Masterminds/sprig/v3.toFloat64`

##  `floor`
Returns the greatest float value greater than or equal to input value.


_Parameters_:

- Input value




_Example_: `floor 123.9999` will return `123.0`



_Implementation_: `github.com/Masterminds/sprig/v3.floor`

##  `fromJson`
Decodes a JSON document into a structure. If the input cannot be decoded as JSON the function will return an empty string.


_Parameters_:

- JSON document




_Example_: `fromJson "{\"foo\": 55}"`.


_Aliases_: `from_json`\
_Implementation_: `github.com/Masterminds/sprig/v3.fromJson`

##  `genCA`
Generates a new, self-signed x509 SSL Certificate Authority using 2048-bit RSA private key. It returns object with PEM-encoded certificate and key. Note that the returned object can be passed to the `genSignedCert` function to sign a certificate using this CA.


_Parameters_:

- Subject common name (CN)

- Cert validity duration in days






_Implementation_: `github.com/Masterminds/sprig/v3.generateCertificateAuthority`

##  `genCAWithKey`
Generates a new, self-signed x509 SSL Certificate Authority using given private key. It returns object with PEM-encoded certificate and key. Note that the returned object can be passed to the `genSignedCert` function to sign a certificate using this CA.


_Parameters_:

- Subject common name (CN)

- Cert validity duration in days

- private key (PEM-encoded; DSA keys are not supported)






_Implementation_: `github.com/Masterminds/sprig/v3.generateCertificateAuthorityWithPEMKey`

##  `genPrivateKey`
Generates a new private key encoded into a PEM block.


_Parameters_:

- Key type (ecdsa, dsa, rsa or ed25519)






_Implementation_: `github.com/Masterminds/sprig/v3.generatePrivateKey`

##  `genSelfSignedCert`
Generates an SSL self-signed certificate.






_Implementation_: `github.com/Masterminds/sprig/v3.generateSelfSignedCertificate`

##  `genSelfSignedCertWithKey`







_Implementation_: `github.com/Masterminds/sprig/v3.generateSelfSignedCertificateWithPEMKey`

##  `genSignedCert`
Generates an SSL certificate and key based on a given CA.






_Implementation_: `github.com/Masterminds/sprig/v3.generateSignedCertificate`

##  `genSignedCertWithKey`







_Implementation_: `github.com/Masterminds/sprig/v3.generateSignedCertificateWithPEMKey`

##  `get`







_Implementation_: `github.com/Masterminds/sprig/v3.get`

##  `getHostByName`







_Implementation_: `github.com/Masterminds/sprig/v3.getHostByName`

##  `has`
Checks if a list has a particular element. It will panic if there is a problem.


_Parameters_:

- Element to find

- List




_Example_: `has 4 $myList`



_Implementation_: `github.com/Masterminds/sprig/v3.has`

##  `hasKey`
Checks if given dictionary contains given key.


_Parameters_:

- Map

- Key to find






_Implementation_: `github.com/Masterminds/sprig/v3.hasKey`

##  `hasPrefix`
Check if string has given prefix.


_Parameters_:

- Prefix

- String






_Implementation_: `github.com/Masterminds/sprig/v3.init.func10`

##  `hasSuffix`
Check if string has given suffix.


_Parameters_:

- Prefix

- Suffix






_Implementation_: `github.com/Masterminds/sprig/v3.init.func11`

##  `htmlDate`
Formats a date for inserting into HTML date picker input field.


_Parameters_:

- Date




_Example_: `now | htmlDate`.



_Implementation_: `github.com/Masterminds/sprig/v3.htmlDate`

##  `htmlDateInZone`
Same as `htmlDate` but with a timezone.


_Parameters_:

- Date

- Timezone




_Example_: `htmlDateInZone (now) "UTC"`.



_Implementation_: `github.com/Masterminds/sprig/v3.htmlDateInZone`

##  `htpasswd`







_Implementation_: `github.com/Masterminds/sprig/v3.htpasswd`

##  `indent`







_Implementation_: `github.com/pluralsh/polly/template.indent`

##  `initial`
Compliments `last` by retuning all but the last element. It will panic if there is a problem.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.initial`

##  `initials`







_Implementation_: `github.com/Masterminds/sprig/v3.initials`

##  `int`
Converts to a `int`.


_Parameters_:

- Value to convert






_Implementation_: `github.com/Masterminds/sprig/v3.toInt`

##  `int64`
Converts to a `int64`.


_Parameters_:

- Value to convert






_Implementation_: `github.com/Masterminds/sprig/v3.toInt64`

##  `isAbs`
Checks whether a path is absolute.


_Parameters_:

- File path






_Implementation_: `path.IsAbs`

##  `kebabcase`
Converts a string from camelCase to kebab-case.


_Parameters_:

- String to convert




_Example_: `kebabcase "FirstName"` returns `first-name`.



_Implementation_: `github.com/huandu/xstrings.ToKebabCase`

##  `keys`
Returns list of all keys from a map.


_Parameters_:

- Map






_Implementation_: `github.com/Masterminds/sprig/v3.keys`

##  `kindIs`







_Implementation_: `github.com/Masterminds/sprig/v3.kindIs`

##  `kindOf`







_Implementation_: `github.com/Masterminds/sprig/v3.kindOf`

##  `last`







_Implementation_: `github.com/Masterminds/sprig/v3.last`

##  `list`







_Implementation_: `github.com/Masterminds/sprig/v3.list`

##  `lower`
Converts the entire string to lowercase.


_Parameters_:

- String to transform




_Example_: `upper \"HELLO\"` will return `hello`.



_Implementation_: `strings.ToLower`

##  `max`
Returns the largest of a series of integers.


_Parameters_:

- Number

- Number

- ...




_Example_: `max 1 2 3` will return `3`.



_Implementation_: `github.com/Masterminds/sprig/v3.max`

##  `maxf`
Returns the largest of a series of floats.


_Parameters_:

- Float number

- Float number

- ...




_Example_: `max 1 2 3.65` will return `3.65`.



_Implementation_: `github.com/Masterminds/sprig/v3.maxf`

##  `merge`







_Implementation_: `github.com/Masterminds/sprig/v3.merge`

##  `mergeOverwrite`







_Implementation_: `github.com/Masterminds/sprig/v3.mergeOverwrite`

##  `min`
Returns the smallest of a series of integers.


_Parameters_:

- Number

- Number

- ...




_Example_: `min 1 2 3` will return `1`.



_Implementation_: `github.com/Masterminds/sprig/v3.min`

##  `minf`
Returns the smallest of a series of floats.


_Parameters_:

- Float number

- Float number

- ...




_Example_: `min 1.3 2 3` will return `1.3`.



_Implementation_: `github.com/Masterminds/sprig/v3.minf`

##  `mod`







_Implementation_: `github.com/Masterminds/sprig/v3.init.func18`

##  `mul`
Multiplies numbers. Accepts two or more inputs.


_Parameters_:

- Number

- Number

- ...




_Example_: `mul 1 2 3` will return `6`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func19`

##  `mulf`
Multiplies float numbers. Accepts two or more inputs.


_Parameters_:

- Float number

- Float number

- ...




_Example_: `mulf 1.5 2 2` returns `6`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func25`

##  `mustAppend`
Appends a new item to existing list, creating a new list. It will return an error to the template engine if there is a problem.


_Parameters_:

- List

- Item to append




_Example_: `mustAppend ( list 1 2 3 ) 5` returns `[1, 2, 3, 5]`.



_Implementation_: `github.com/Masterminds/sprig/v3.mustPush`

##  `mustChunk`







_Implementation_: `github.com/Masterminds/sprig/v3.mustChunk`

##  `mustCompact`
Accepts a list and removes entries with empty values. It will return an error to the template engine if there is a problem.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.mustCompact`

##  `mustDateModify`






_Aliases_: `must_date_modify`\
_Implementation_: `github.com/Masterminds/sprig/v3.mustDateModify`

##  `mustDeepCopy`







_Implementation_: `github.com/Masterminds/sprig/v3.mustDeepCopy`

##  `mustFirst`
Returns head item on a list. It will return an error to the template engine if there is a problem.


_Parameters_:

- List




_Example_: `mustFirst $myList`



_Implementation_: `github.com/Masterminds/sprig/v3.mustFirst`

##  `mustFromJson`







_Implementation_: `github.com/Masterminds/sprig/v3.mustFromJson`

##  `mustHas`
Checks if a list has a particular element. It will return an error to the template engine if there is a problem.


_Parameters_:

- Element to find

- List




_Example_: `mustHas 4 $myList`



_Implementation_: `github.com/Masterminds/sprig/v3.mustHas`

##  `mustInitial`
Compliments `last` by retuning all but the last element. It will return an error to the template engine ifd there is a problem.


_Parameters_:

- List




_Example_: `mustInitial $myList`



_Implementation_: `github.com/Masterminds/sprig/v3.mustInitial`

##  `mustLast`







_Implementation_: `github.com/Masterminds/sprig/v3.mustLast`

##  `mustMerge`







_Implementation_: `github.com/Masterminds/sprig/v3.mustMerge`

##  `mustMergeOverwrite`







_Implementation_: `github.com/Masterminds/sprig/v3.mustMergeOverwrite`

##  `mustPrepend`







_Implementation_: `github.com/Masterminds/sprig/v3.mustPrepend`

##  `mustPush`







_Implementation_: `github.com/Masterminds/sprig/v3.mustPush`

##  `mustRegexFind`







_Implementation_: `github.com/Masterminds/sprig/v3.mustRegexFind`

##  `mustRegexFindAll`







_Implementation_: `github.com/Masterminds/sprig/v3.mustRegexFindAll`

##  `mustRegexMatch`







_Implementation_: `github.com/Masterminds/sprig/v3.mustRegexMatch`

##  `mustRegexReplaceAll`







_Implementation_: `github.com/Masterminds/sprig/v3.mustRegexReplaceAll`

##  `mustRegexReplaceAllLiteral`







_Implementation_: `github.com/Masterminds/sprig/v3.mustRegexReplaceAllLiteral`

##  `mustRegexSplit`







_Implementation_: `github.com/Masterminds/sprig/v3.mustRegexSplit`

##  `mustRest`
Gets tail of the list (everything but the first item). It will return an error to the template engine if there is a problem.


_Parameters_:

- List




_Example_: `mustRest $myList`



_Implementation_: `github.com/Masterminds/sprig/v3.mustRest`

##  `mustReverse`
Produces a new list with the reversed elements of the given list. It will return an error to the template engine if there is a problem.


_Parameters_:

- List




_Example_: `mustReverse $myList`



_Implementation_: `github.com/Masterminds/sprig/v3.mustReverse`

##  `mustSlice`







_Implementation_: `github.com/Masterminds/sprig/v3.mustSlice`

##  `mustToDate`
Converts a string to a date. If the string can’t be converted it returns the zero value. It will return an error to the template engine if there is a problem.


_Parameters_:

- Date layout

- Date string






_Implementation_: `github.com/Masterminds/sprig/v3.mustToDate`

##  `mustToJson`







_Implementation_: `github.com/Masterminds/sprig/v3.mustToJson`

##  `mustToPrettyJson`







_Implementation_: `github.com/Masterminds/sprig/v3.mustToPrettyJson`

##  `mustToRawJson`







_Implementation_: `github.com/Masterminds/sprig/v3.mustToRawJson`

##  `mustUniq`
Generates a list with all of the duplicates removed. It will return an error to the template engine if there is a problem.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.mustUniq`

##  `mustWithout`
Filters items out of a list. It will return an error to the template engine if there is a problem.


_Parameters_:

- CList

- Item to filter out




_Example_: `mustWithout ( list 1 2 3 4 5) 1 3 5` returns `[2, 4]`.



_Implementation_: `github.com/Masterminds/sprig/v3.mustWithout`

##  `nindent`







_Implementation_: `github.com/pluralsh/polly/template.nindent`

##  `nospace`
Removes all whitespace from a string.


_Parameters_:

- String to transform




_Example_: `nospace "hello w o r l d"` will return `helloworld`.



_Implementation_: `github.com/Masterminds/goutils.DeleteWhiteSpace`

##  `omit`







_Implementation_: `github.com/Masterminds/sprig/v3.omit`

##  `osBase`
Returns the last element of a file path.


_Parameters_:

- File path




_Example_: `osClean "/foo/bar/../baz"` and `osClean "C:\\foo\\bar\\..\\baz"` will resolve the `..` and return `foo/baz` on Linux and `C:\foo\baz` on Windows.



_Implementation_: `path/filepath.Base`

##  `osClean`
Cleans up a path.


_Parameters_:

- File path




_Example_: `osClean "/foo/bar/../baz"` and `osClean "C:\\foo\\bar\\..\\baz"` will resolve the `..` and return `foo/baz` on Linux and `C:\foo\baz` on Windows.



_Implementation_: `path/filepath.Clean`

##  `osDir`
Returns the directory, stripping the last part of the path.


_Parameters_:

- File path




_Example_: `osDir "/foo/bar/baz"` returns `/foo/bar` on Linux, and `osDir "C:\\foo\\bar\\baz"` returns `C:\\foo\\bar` on Windows.



_Implementation_: `path/filepath.Dir`

##  `osExt`
Return the file extension.


_Parameters_:

- File path




_Example_: `osExt "/foo.bar"` and `osExt "C:\\foo.bar"` will return `.bar` on Linux and Windows, respectively.



_Implementation_: `path/filepath.Ext`

##  `osIsAbs`
Checks whether a file path is absolute.


_Parameters_:

- File path






_Implementation_: `path/filepath.IsAbs`

##  `pick`







_Implementation_: `github.com/Masterminds/sprig/v3.pick`

##  `pluck`







_Implementation_: `github.com/Masterminds/sprig/v3.pluck`

##  `plural`







_Implementation_: `github.com/Masterminds/sprig/v3.plural`

##  `prepend`







_Implementation_: `github.com/Masterminds/sprig/v3.prepend`

##  `push`







_Implementation_: `github.com/Masterminds/sprig/v3.push`

##  `quote`







_Implementation_: `github.com/Masterminds/sprig/v3.quote`

##  `randAlpha`







_Implementation_: `github.com/Masterminds/sprig/v3.randAlpha`

##  `randAlphaNum`







_Implementation_: `github.com/Masterminds/sprig/v3.randAlphaNumeric`

##  `randAscii`







_Implementation_: `github.com/Masterminds/sprig/v3.randAscii`

##  `randBytes`
Accepts a count and generates cryptographically secure random sequence of bytes. The sequence is returned as a Base64 encoded string.


_Parameters_:

- Number of bytes to generate






_Implementation_: `github.com/Masterminds/sprig/v3.randBytes`

##  `randInt`
Returns a random integer value from min (inclusive) to max (exclusive).


_Parameters_:

- Min value (inclusive)

- Max value (exclusive)




_Example_:  `randInt 12 30` will produce a random number in the range from 12 to 30.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func20`

##  `randNumeric`







_Implementation_: `github.com/Masterminds/sprig/v3.randNumeric`

##  `regexFind`







_Implementation_: `github.com/Masterminds/sprig/v3.regexFind`

##  `regexFindAll`







_Implementation_: `github.com/Masterminds/sprig/v3.regexFindAll`

##  `regexMatch`







_Implementation_: `github.com/Masterminds/sprig/v3.regexMatch`

##  `regexQuoteMeta`







_Implementation_: `github.com/Masterminds/sprig/v3.regexQuoteMeta`

##  `regexReplaceAll`







_Implementation_: `github.com/Masterminds/sprig/v3.regexReplaceAll`

##  `regexReplaceAllLiteral`







_Implementation_: `github.com/Masterminds/sprig/v3.regexReplaceAllLiteral`

##  `regexSplit`







_Implementation_: `github.com/Masterminds/sprig/v3.regexSplit`

##  `repeat`







_Implementation_: `github.com/Masterminds/sprig/v3.init.func2`

##  `replace`







_Implementation_: `strings.ReplaceAll`

##  `rest`
Gets tail of the list (everything but the first item).


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.rest`

##  `reverse`
Produces a new list with the reversed elements of the given list.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.reverse`

##  `round`
Returns a float value with the remainder rounded to the given number to digits after the decimal point.


_Parameters_:

- Float number

- Number of digits to round to




_Example_: `round 123.55555 3` will return `123.556`.



_Implementation_: `github.com/Masterminds/sprig/v3.round`

##  `semver`







_Implementation_: `github.com/Masterminds/sprig/v3.semver`

##  `semverCompare`






_Aliases_: `semver_compare`\
_Implementation_: `github.com/Masterminds/sprig/v3.semverCompare`

##  `seq`
Works like Bash `seq` command. Specify 1 parameter (`end`) to generate all counting integers between 1 and `end` inclusive. Specify 2 parameters (`start` and `end`) to generate all counting integers between `start` and `end` inclusive incrementing or decrementing by 1. Specify 3 parameters (`start`, `step` and `end`) to generate all counting integers between `start` and `end` inclusive incrementing or decrementing by `step`.






_Implementation_: `github.com/Masterminds/sprig/v3.seq`

##  `set`







_Implementation_: `github.com/Masterminds/sprig/v3.set`

##  `sha1sum`







_Implementation_: `github.com/Masterminds/sprig/v3.sha1sum`

##  `sha256sum`
Generates SHA256 hash of an input.


_Parameters_:

- Input value





_Aliases_: `sha26sum`\
_Implementation_: `github.com/Masterminds/sprig/v3.sha256sum`

##  `sha512sum`
Generates SHA512 hash of an input.


_Parameters_:

- Input value




_Example_: `sha512sum "Hello world!"`.



_Implementation_: `github.com/Masterminds/sprig/v3.sha512sum`

##  `shuffle`
Shuffles a string.


_Parameters_:

- String to shuffle




_Example_: `shuffle "hello"`.



_Implementation_: `github.com/huandu/xstrings.Shuffle`

##  `slice`







_Implementation_: `github.com/pluralsh/polly/template.slice`

##  `snakecase`
Converts a string from camelCase to snake_case.


_Parameters_:

- String to convert




_Example_: `camelcase "FirstName"` returns `first_name`.



_Implementation_: `github.com/huandu/xstrings.ToSnakeCase`

##  `sortAlpha`







_Implementation_: `github.com/Masterminds/sprig/v3.sortAlpha`

##  `splitList`







_Implementation_: `github.com/Masterminds/sprig/v3.init.func13`

##  `splitn`







_Implementation_: `github.com/Masterminds/sprig/v3.splitn`

##  `squote`







_Implementation_: `github.com/Masterminds/sprig/v3.squote`

##  `sub`







_Implementation_: `github.com/Masterminds/sprig/v3.init.func16`

##  `subf`







_Implementation_: `github.com/Masterminds/sprig/v3.init.func23`

##  `substr`







_Implementation_: `github.com/Masterminds/sprig/v3.substring`

##  `swapcase`
Swaps the case of a string using a word based algorithm.


_Parameters_:

- String to convert




_Example_: `swapcase "This Is A.Test"` returns `tHIS iS a.tEST`.



_Implementation_: `github.com/Masterminds/goutils.SwapCase`

##  `ternary`
Takes two values and a test value. If the test value is true, the first value will be returned. If the test value is false, the second value will be returned. This is similar to the C ternary operator.


_Parameters_:

- First value

- Second value

- Test value




_Example_: `ternary "foo" "bar" true` or `true | "foo" "bar"` will return `"foo"`.



_Implementation_: `github.com/pluralsh/polly/template.ternary`

##  `title`
Converts a string to title case.


_Parameters_:

- String




_Example_: `title "hello world"` returns `"Hello World"`.



_Implementation_: `strings.Title`

##  `toDate`
Converts a string to a date. If the string can’t be converted it returns the zero value.


_Parameters_:

- Date layout

- Date string






_Implementation_: `github.com/Masterminds/sprig/v3.toDate`

##  `toDecimal`
Converts a Unix octal to a `int64`.


_Parameters_:

- Unix octal




_Example_: `"0777" | toDecimal` will convert `0777` to `511` and return the value as `int64`.



_Implementation_: `github.com/Masterminds/sprig/v3.toDecimal`

##  `toJson`
Encodes an item into JSON string. If the item cannot be converted to JSON the function will return an empty string.


_Parameters_:

- An item to encode




_Example_: `toJson .Item` returns JSON string representation of `.Item`.


_Aliases_: `to_json`\
_Implementation_: `github.com/Masterminds/sprig/v3.toJson`

##  `toPrettyJson`
Encodes an item into pretty (intended) JSON string.


_Parameters_:

- An item to encode




_Example_: `toPrettyJson .Item` returns intended JSON string representation of `.Item`.



_Implementation_: `github.com/Masterminds/sprig/v3.toPrettyJson`

##  `toRawJson`
Encodes an item into JSON string with HTML characters unescaped.


_Parameters_:

- An item to encode




_Example_: `toRawJson .Item` returns unescaped JSON string representation of `.Item`.



_Implementation_: `github.com/Masterminds/sprig/v3.toRawJson`

##  `toString`
Converts to a string.


_Parameters_:

- Value






_Implementation_: `github.com/Masterminds/sprig/v3.strval`

##  `toStrings`
Converts a list, slice or array to a list of strings.


_Parameters_:

- List




_Example_: `list 1 2 3 | toString` converts `1`, `2` and `3` to strings and then returns them as a list.



_Implementation_: `github.com/Masterminds/sprig/v3.strslice`

##  `trim`
Removes space from either side of a string.


_Parameters_:

- String to trim




_Example_: `trim "  hello  "` will return `hello`.



_Implementation_: `strings.TrimSpace`

##  `trimAll`
Removes given characters from the front or back of a string.


_Parameters_:

- Character to remove

- String to trim




_Example_: `trimAll "$" "$5.00"` will return `5.00` (as a string).



_Implementation_: `github.com/Masterminds/sprig/v3.init.func4`

##  `trimPrefix`
Trims just the prefix from a string.


_Parameters_:

- Character to remove

- String to trim




_Example_: `trimPrefix "-" "-hello"` will return `hello`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func6`

##  `trimSuffix`
Trims just the suffix from a string.


_Parameters_:

- Character to remove

- String to trim




_Example_: `trimSuffix "-" "hello-"` will return `hello`.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func5`

##  `trimall`







_Implementation_: `github.com/Masterminds/sprig/v3.init.func3`

##  `trunc`







_Implementation_: `github.com/Masterminds/sprig/v3.trunc`

##  `tuple`







_Implementation_: `github.com/Masterminds/sprig/v3.list`

##  `typeIs`







_Implementation_: `github.com/Masterminds/sprig/v3.typeIs`

##  `typeIsLike`







_Implementation_: `github.com/Masterminds/sprig/v3.typeIsLike`

##  `typeOf`







_Implementation_: `github.com/Masterminds/sprig/v3.typeOf`

##  `uniq`
Generates a list with all of the duplicates removed.


_Parameters_:

- List






_Implementation_: `github.com/Masterminds/sprig/v3.uniq`

##  `unixEpoch`
Returns the seconds since the Unix epoch for a time.


_Parameters_:

- Time (`time.Time`)




_Example_: `now | unixEpoch`



_Implementation_: `github.com/Masterminds/sprig/v3.unixEpoch`

##  `unset`
Given a map and a key it deletes the key from the map. It returns dictionary. Note that if the key is not found this operation will simply return. No error will be generated.


_Parameters_:

- Map

- Key of an item to delete






_Implementation_: `github.com/Masterminds/sprig/v3.unset`

##  `until`
Builds a range of integers.


_Parameters_:

- Max value (exclusive)




_Example_: `until 5` will return a list `[0, 1, 2, 3, 4]`.



_Implementation_: `github.com/Masterminds/sprig/v3.until`

##  `untilStep`
Like `until` generates a list of counting integers but it allows to define a start, stop and step.


_Parameters_:

- Start value (inclusive)

- Max value (exclusive)

- Step




_Example_: `untilStep 3 6 2` will return `[3, 5]` by starting with 3 and adding 2 until it is equal or greater than 6.



_Implementation_: `github.com/Masterminds/sprig/v3.untilStep`

##  `untitle`
Removes title casing.


_Parameters_:

- String to transform




_Example_: `untitle "Hello World"` returns `"hello world"`.



_Implementation_: `github.com/Masterminds/sprig/v3.untitle`

##  `upper`
Converts the entire string to uppercase.


_Parameters_:

- String to transform




_Example_: `upper "hello"` returns `HELLO`



_Implementation_: `strings.ToUpper`

##  `urlJoin`
Joins map produced by `urlParse` to produce URL string.


_Parameters_:

- Map produced by `urlParse`




_Example_: `urlJoin (dict "fragment" "fragment" "host" "host:80" "path" "/path" "query" "query" "scheme" "http")` returns `proto://host:80/path?query#fragment`.



_Implementation_: `github.com/Masterminds/sprig/v3.urlJoin`

##  `urlParse`
Parses string for URL and produces dict with URL parts. For more info check https://golang.org/pkg/net/url/#URL.


_Parameters_:

- String with URL






_Implementation_: `github.com/Masterminds/sprig/v3.urlParse`

##  `values`
Returns list of all values from a map.


_Parameters_:

- Map






_Implementation_: `github.com/Masterminds/sprig/v3.values`

##  `without`
Filters items out of a list. It can take more than one filter.


_Parameters_:

- List

- Item to filter out




_Example_: `without ( list 1 2 3 4 5) 1 3 5` returns `[2, 4]`.



_Implementation_: `github.com/Masterminds/sprig/v3.without`

##  `wrap`
Wraps text at a given column count.


_Parameters_:

- Column count

- Text




_Example_: `wrap 80 $text` will wrap the string in `$text` at 80 columns.



_Implementation_: `github.com/Masterminds/sprig/v3.init.func7`

##  `wrapWith`
Works as `wrap` but lets you specify the string to wrap with (`wrap` uses `\n`).


_Parameters_:

- Column count

- String to wrap with

- Text




_Example_: `wrapWith 5 "\t" "Hello world"` returns `hello world` (where the whitespace is an ASCII tab character).



_Implementation_: `github.com/Masterminds/sprig/v3.init.func8`
