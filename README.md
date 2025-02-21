# Nettoyage
./network.sh down
docker rm -f $(docker ps -aq)
docker volume prune -f

# Démarrer le réseau avec un seul pair
./network.sh up createChannel -c landreg -ca

# Déployer le chaincode avec une politique d'endorsement simple
./network.sh deployCC -ccn land-registry -ccp ../land-registry/chaincode -ccl javascript -c landreg -ccep "AND('Org1MSP.peer')"

# Chaincode dependencies
cd land-registry/chaincode
npm install fabric-contract-api fabric-shim

# Application dependencies
cd ../application
npm install fabric-network fabric-ca-client express body-parser
npm install swagger-jsdoc swagger-ui-express


# OU tu peux juste faire un npm install dans chacun des dossiers ou il y a package json

# Enregistrer les utilisateurs
cd ../land-registry/application
node registerUser.js

# Demarrer l'api
node api/server.js



# Tester les Api sur Swagger

# Dans l'interface Swagger, il faut d'abord définir l'en-tête d'authentification :
# Cliquez sur le bouton "Authorize" (🔓) en haut de la page Swagger
# Dans le champ "user-id", entrez une des valeurs suivantes :
# SELLER1 (pour le vendeur)
# BUYER1 (pour l'acheteur)
# NOTARY1 (pour le notaire)
# Cliquez sur "Authorize"

# Exemple pour creer un nouveau titre foncier voici l'url http://localhost:3000/api/seller/titles
# Et voici un exemple d'objet: 
<!-- {
  "titleId": "TITLE001",
  "location": "123 Rue de Paris",
  "area": 150,
  "propertyType": "TERRAIN",
  "maidsafeHash": "QmHash123"
} -->

# Vérifier les transactions dans Hyperledger Fabric
# 1. D'abord, entrer dans le conteneur CLI
docker exec -it cli bash

# 2. Configurer les variables d'environnement pour Org1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051

# 3. Maintenant vous pouvez lister les chaincodes installés
peer chaincode list --installed

# 4. Pour interroger le chaincode (obtenir un titre par exemple)
peer chaincode query -C landreg -n land-registry -c '{"Args":["getLandTitle","TITLE001"]}'

# 5. Pour voir tous les titres en vente
peer chaincode query -C landreg -n land-registry -c '{"Args":["queryTitlesForSale"]}'

# Vérifier un titre spécifique
node verify.js TITLE001

# Vérifier via l'API
curl http://localhost:3000/api/titles/TITLE001/history \
  -H "user-id: SELLER1"

# Vérifier l'état actuel
curl http://localhost:3000/api/titles/verify/TITLE001 \
  -H "user-id: SELLER1"