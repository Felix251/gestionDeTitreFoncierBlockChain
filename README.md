# Land Registry Blockchain Project

## Overview
This project implements a blockchain-based land registry system using Hyperledger Fabric, providing a secure and transparent platform for managing property titles.

## Prerequisites
- Docker
- Node.js
- Hyperledger Fabric

## Project Structure
```
fabric-samplest/
│
├── network/
│   └── network.sh            # Network management script
│
├── land-registry/
│   ├── chaincode/            # Blockchain chaincode
│   └── application/          # Application logic
```

## Setup and Installation

### Network Setup
1. Clean existing Docker containers and volumes:
```bash
./network.sh down
docker rm -f $(docker ps -aq)
docker volume prune -f
```

2. Start the network with a single peer:
```bash
./network.sh up createChannel -c landreg -ca
```

### Chaincode Deployment
Deploy the chaincode with a simple endorsement policy:
```bash
./network.sh deployCC -ccn land-registry \
    -ccp ../land-registry/chaincode \
    -ccl javascript \
    -c landreg \
    -ccep "AND('Org1MSP.peer')"
```

### Dependencies Installation
#### Chaincode Dependencies
```bash
cd land-registry/chaincode
npm install fabric-contract-api fabric-shim
```

#### Application Dependencies
```bash
cd ../application
npm install fabric-network fabric-ca-client express body-parser
npm install swagger-jsdoc swagger-ui-express
```

### User Registration
```bash
cd ../land-registry/application
node registerUser.js
```

### Start the API
```bash
node api/server.js
```

## API Usage with Swagger

### Authentication
1. Open Swagger UI
2. Click the "Authorize" button (🔓)
3. Enter one of the following user IDs:
   - `SELLER1` (Seller)
   - `BUYER1` (Buyer)
   - `NOTARY1` (Notary)

### Creating a Land Title
**Endpoint:** `POST http://localhost:3000/api/seller/titles`

**Example Request Body:**
```json
{
   "titleId": "TITLE001",
   "location": "123 Rue de Paris",
   "area": 150,
   "propertyType": "TERRAIN",
   "maidsafeHash": "QmHash123"
}
```

## Debugging and Verification

### Hyperledger Fabric CLI

1. Enter the CLI container:
```bash
docker exec -it cli bash
```

2. Set environment variables for Org1:
```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
```

### Chaincode Queries

List installed chaincodes:
```bash
peer chaincode list --installed
```

Query a specific land title:
```bash
peer chaincode query -C landreg -n land-registry -c '{"Args":["getLandTitle","TITLE001"]}'
```

List titles for sale:
```bash
peer chaincode query -C landreg -n land-registry -c '{"Args":["queryTitlesForSale"]}'
```

## Additional Verification Methods

### Verify a Title
```bash
node verify.js TITLE001
```

### API Verification
Get title history:
```bash
curl http://localhost:3000/api/titles/TITLE001/history \
   -H "user-id: SELLER1"
```

Check current title status:
```bash
curl http://localhost:3000/api/titles/verify/TITLE001 \
   -H "user-id: SELLER1"
```

