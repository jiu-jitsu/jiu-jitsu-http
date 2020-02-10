
### How to generate ssl certificates

`openssl req -x509 -sha256 -nodes -days 3650 -newkey rsa:1024 -keyout server.key -out server.cert -config openssl.conf`

##### Create self signed certificate for domain and subdomains

```
[req]
default_bits = 1024
default_keyfile = oats.key
encrypt_key = no
utf8 = yes
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = UK
ST = London
L = London
O  = TestCom
CN = *.test.com

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = test.com
DNS.2 = *.test.com
```
