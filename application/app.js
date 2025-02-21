// land-registry/application/app.js
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class LandRegistryApp {
    constructor() {
        this.channelName = 'landreg';
        this.chaincodeName = 'land-registry';
    }

    async initialize(userId) {
        try {
            const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
            
            if (!fs.existsSync(ccpPath)) {
                throw new Error(`Fichier de connexion non trouvé: ${ccpPath}`);
            }
            console.log('Fichier de connexion trouvé');

            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
            console.log('Configuration réseau chargée');

            const walletPath = path.join(process.cwd(), 'wallet');
            this.wallet = await Wallets.newFileSystemWallet(walletPath);
            console.log('Wallet créée à:', walletPath);

            const identity = await this.wallet.get(userId);
            if (!identity) {
                throw new Error(`L'identité ${userId} n'existe pas dans la wallet`);
            }
            console.log(`Identité ${userId} trouvée dans la wallet`);

            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet: this.wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true }
            });
            console.log('Gateway connectée');

            this.network = await this.gateway.getNetwork(this.channelName);
            console.log('Connecté au channel:', this.channelName);

            this.contract = this.network.getContract(this.chaincodeName);
            console.log('Contract obtenu:', this.chaincodeName);

        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            throw error;
        }
    }

    async createLandTitle(userId, titleId, location, area, propertyType, maidsafeHash) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            console.log('Création du titre foncier...', {
                userId, titleId, location, area, propertyType, maidsafeHash
            });

            let transaction = this.contract.createTransaction('createLandTitle');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(
                titleId,
                userId,
                location,
                area.toString(),
                propertyType,
                maidsafeHash || ''
            );

            console.log('Résultat de la création:', result.toString());
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la création du titre:', error);
            throw error;
        }
    }

    async initiateSale(userId, titleId, price) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            let transaction = this.contract.createTransaction('initiateSale');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(
                titleId,
                userId,
                price.toString()
            );
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de l\'initiation de la vente:', error);
            throw error;
        }
    }

    async makePurchaseOffer(userId, titleId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            let transaction = this.contract.createTransaction('makePurchaseOffer');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(titleId, userId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la création de l\'offre:', error);
            throw error;
        }
    }

    async approveAsNotary(userId, titleId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            let transaction = this.contract.createTransaction('approveAsNotary');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(titleId, userId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de l\'approbation notaire:', error);
            throw error;
        }
    }

    async approveAsSeller(userId, titleId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            let transaction = this.contract.createTransaction('approveAsSeller');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(titleId, userId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de l\'approbation vendeur:', error);
            throw error;
        }
    }

    async approveAsBuyer(userId, titleId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            let transaction = this.contract.createTransaction('approveAsBuyer');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(titleId, userId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de l\'approbation acheteur:', error);
            throw error;
        }
    }

    async finalizeSale(userId, titleId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            let transaction = this.contract.createTransaction('finalizeSale');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(titleId, userId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la finalisation:', error);
            throw error;
        }
    }

    async addLien(userId, titleId, lienHolder, amount, duration) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            let transaction = this.contract.createTransaction('addLien');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(
                titleId,
                lienHolder,
                amount.toString(),
                duration.toString()
            );
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'hypothèque:', error);
            throw error;
        }
    }

    async removeLien(userId, titleId, lienId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            let transaction = this.contract.createTransaction('removeLien');
            transaction.setEndorsingPeers(['peer0.org1.example.com:7051']);

            const result = await transaction.submit(titleId, lienId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'hypothèque:', error);
            throw error;
        }
    }

    async getLandTitle(userId, titleId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            const result = await this.contract.evaluateTransaction('getLandTitle', titleId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la récupération du titre:', error);
            throw error;
        }
    }

    async queryTitlesByOwner(userId, owner) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            const result = await this.contract.evaluateTransaction('queryTitlesByOwner', owner);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la recherche des titres:', error);
            throw error;
        }
    }

    async queryTitlesForSale(userId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            const result = await this.contract.evaluateTransaction('queryTitlesForSale');
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la recherche des titres en vente:', error);
            throw error;
        }
    }

    async getTitleHistory(userId, titleId) {
        try {
            if (!this.contract) {
                await this.initialize(userId);
            }
            const result = await this.contract.evaluateTransaction('getTitleHistory', titleId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.gateway) {
            await this.gateway.disconnect();
            console.log('Déconnecté du gateway');
        }
    }
}

module.exports = LandRegistryApp;