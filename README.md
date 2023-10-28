# uniswap-universal-batcher
Batch registering to Mongo DB from decoded Universal-Router Data in Ethereum

# Installation and Running

## 1. Install Mongo DB and create Database

```bash
sudo apt-get install -y mongodb-org
```

This example sets

- user: user
- password: password
- db: uniswapData

```bash
set -e
mongosh <<EOF
use uniswapData

db.createUser({
  user: user,
  pwd: password,
  roles: [{
    role: 'readWrite',
    db: uniswapData
  }]
})
EOF
```
 
##  2. Install Node Js

```bash
$ sudo apt install nodejs
```

## 3. [Install uniswap-universal-decoder](https://github.com/HiroyukiNaito/uniswap-universal-decoder)

```bash
$ cd ./[application execute path]
$ git clone https://github.com/HiroyukiNaito/uniswap-universal-decoder.git
$ cd uniswap-universal-decoder
$ yarn install 
```

## 4. Install uniswap-universal-batcher

```bash
$ cd ./[application execute path]
$ git clone https://github.com/HiroyukiNaito/uniswap-universal-batcher.git
$ cd uniswap-universal-batcher
$ yarn install 
```

## 5. Set environmental valuables of uniswap-universal-batcher

```bash
$ vi .env
```
```bash
# Mongo DB name you want to store 
MONGODB_DB=uniswapData

# Mongo DB user you want to use
MONGODB_USER=user

# Mongo DB password you designated
MONGODB_PASSWORD=password

# Mongo DB host url or IP address
MONGODB_HOST=localhost

# Node.js heap size
NODE_OPTIONS="--max-old-space-size=4046"

# Request block size in parallel (async)
BLOCK_RANGE_SIZE=1

# Retrive Days (from now)
RETRIEVE_DAYS=0.001

# Pause time per requests
WAIT_TIME=1000

# Request block size in parallel (async) in L2 block
L2_BLOCK_RANGE_SIZE=7

# Retrive Days (from now) in L2 block
L2_RETRIEVE_DAYS=0.001

# Pause time per requests in L2 block
L2_WAIT_TIME=1000

# L1 Uniswap Universal Router Address
UNIVERSAL_ROUTER_ADDRESS=0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD

# Your L1 Websocket RPC endpoint url 
RPC_WEBSOCKET_URL=ws://localhost:8546

# L2 Uniswap Universal Router Address
L2_UNIVERSAL_ROUTER_ADDRESS=0x198EF79F1F515F02dFE9e3115eD9fC07183f02fC

# Your L2 Websocket RPC endpoint url
# Currently supports only Optimism and Base
L2_RPC_WEBSOCKET_URL=ws://localhost:9546

# CAUTION: If you don't have L2 RPC endpoint, please assign empty value (ex. L2_RPC_WEBSOCKET_URL="")
# Will skip obtaining L2 endpoint data
```

## 6. Export environmental valuables
```bash
$ export $(cat .env | xargs)
```

## 7. Run the app
```bash
$ node runBatch.js
```

