// land-registry/application/app.js
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class LandRegistryApp {
    constructor() {
        this.channelName = 'landreg';
        this.chaincodeName = 'land-registry';
    }

    async initialize() {
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

            const identity = await this.wallet.get('appUser');
            if (!identity) {
                throw new Error('L\'identité appUser n\'existe pas dans la wallet');
            }
            console.log('Identité appUser trouvée dans la wallet');

            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet: this.wallet,
                identity: 'appUser',
                discovery: { enabled: true, asLocalhost: true },
                eventHandlerOptions: {
                    commitTimeout: 300,
                    strategy: null
                }
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async createLandTitle(titleId, owner, location, area, propertyType, maidsafeHash) {
        try {
            console.log('Création du titre foncier...');
            console.log('Paramètres:', { titleId, owner, location, area, propertyType, maidsafeHash });
            
            const transaction = this.contract.createTransaction('createLandTitle');
            const result = await transaction.submit(
                titleId,
                owner,
                location,
                area.toString(),
                propertyType,
                maidsafeHash
            );
            
            console.log('Transaction soumise, attente de la confirmation...');
            
            // Attendre que la transaction soit propagée
            await this.sleep(2000);
            
            const landTitle = JSON.parse(result.toString());
            console.log('Titre foncier créé avec succès');
            return landTitle;
        } catch (error) {
            console.error('Erreur détaillée lors de la création du titre:', error);
            throw error;
        }
    }

    async getLandTitle(titleId) {
        try {
            console.log(`Recherche du titre: ${titleId}`);
            // Essayer de récupérer le titre plusieurs fois en cas d'échec
            for (let i = 0; i < 3; i++) {
                try {
                    const result = await this.contract.evaluateTransaction('getLandTitle', titleId);
                    return JSON.parse(result.toString());
                } catch (error) {
                    if (i < 2) {
                        console.log(`Tentative ${i + 1} échouée, nouvelle tentative dans 2 secondes...`);
                        await this.sleep(2000);
                    } else {
                        throw error;
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du titre:', error);
            throw error;
        }
    }

    async queryTitlesByOwner(owner) {
        try {
            const result = await this.contract.evaluateTransaction('queryTitlesByOwner', owner);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Erreur lors de la recherche des titres:', error);
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

async function testApp() {
    const app = new LandRegistryApp();
    try {
        console.log('Initialisation de l\'application...');
        await app.initialize();
        
        console.log('\nCréation d\'un nouveau titre foncier...');
        const newTitle = await app.createLandTitle(
            'TITLE001',
            'Jean Dupont',
            '123 Rue de Paris',
            150,
            'TERRAIN',
            'QmHash123'
        );
        console.log('Nouveau titre créé:', JSON.stringify(newTitle, null, 2));

        console.log('\nRécupération du titre...');
        const title = await app.getLandTitle('TITLE001');
        console.log('Titre récupéré:', JSON.stringify(title, null, 2));

        console.log('\nRecherche des titres par propriétaire...');
        const ownerTitles = await app.queryTitlesByOwner('Jean Dupont');
        console.log('Titres trouvés:', JSON.stringify(ownerTitles, null, 2));

    } catch (error) {
        console.error('Erreur dans le test:', error);
    } finally {
        await app.disconnect();
    }
}

if (require.main === module) {
    testApp();
}

module.exports = LandRegistryApp;