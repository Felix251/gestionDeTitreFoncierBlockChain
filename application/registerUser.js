const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

async function main() {
    try {
        // Charger le fichier de connexion
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Fichier de connexion non trouvé à : ${ccpPath}`);
        }
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Créer une nouvelle CA client
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        if (!caInfo) {
            throw new Error('Impossible de trouver CA.org1.example.com dans le fichier de connexion');
        }

        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Créer une nouvelle wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Enregistrer l'admin
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('L\'identité admin existe déjà dans la wallet');
            return;
        }

        // Enroll admin
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('admin', x509Identity);
        console.log('Admin enregistré avec succès dans la wallet');

        // Enregistrer l'utilisateur de l'application
        const adminIdentity = await wallet.get('admin');
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client'
        }, adminUser);

        const enrollment2 = await ca.enroll({
            enrollmentID: 'appUser',
            enrollmentSecret: secret
        });

        const x509Identity2 = {
            credentials: {
                certificate: enrollment2.certificate,
                privateKey: enrollment2.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('appUser', x509Identity2);
        console.log('Utilisateur appUser enregistré avec succès');

    } catch (error) {
        console.error(`Erreur: ${error}`);
        process.exit(1);
    }
}

main();