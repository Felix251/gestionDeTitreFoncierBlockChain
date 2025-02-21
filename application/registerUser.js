// land-registry/application/registerUser.js
const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

const users = [
    { id: 'SELLER1', name: 'Jean Dupont', role: 'seller' },
    { id: 'BUYER1', name: 'Marie Martin', role: 'buyer' },
    { id: 'NOTARY1', name: 'Pierre Legrand', role: 'notary' }
];

async function main() {
    try {
        // Charger le fichier de connexion
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Créer une nouvelle wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet créée à : ${walletPath}`);

        // Vérifier si l'admin existe déjà
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('L\'identité admin existe déjà dans la wallet');
        } else {
            // Créer une nouvelle CA client
            const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
            const caTLSCACerts = caInfo.tlsCACerts.pem;
            const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

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
        }

        // Obtenir l'admin pour enregistrer les utilisateurs
        const adminIdentity = await wallet.get('admin');
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Créer une nouvelle CA client pour les utilisateurs
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Enregistrer chaque utilisateur
        for (const user of users) {
            try {
                // Vérifier si l'utilisateur existe déjà
                const userIdentity = await wallet.get(user.id);
                if (userIdentity) {
                    console.log(`L'identité ${user.id} existe déjà`);
                    continue;
                }

                // Enregistrer l'utilisateur
                const secret = await ca.register({
                    enrollmentID: user.id,
                    enrollmentSecret: 'userpass',
                    role: 'client',
                    attrs: [
                        {
                            name: 'role',
                            value: user.role,
                            ecert: true
                        }
                    ]
                }, adminUser);

                // Enroll l'utilisateur
                const enrollment = await ca.enroll({
                    enrollmentID: user.id,
                    enrollmentSecret: 'userpass'
                });

                const x509Identity = {
                    credentials: {
                        certificate: enrollment.certificate,
                        privateKey: enrollment.key.toBytes(),
                    },
                    mspId: 'Org1MSP',
                    type: 'X.509',
                };

                await wallet.put(user.id, x509Identity);
                console.log(`✅ Utilisateur ${user.id} enregistré avec succès comme ${user.role}`);

            } catch (error) {
                console.error(`❌ Échec de l'enregistrement de ${user.id}: ${error.message}`);
            }
        }
    } catch (error) {
        console.error(`❌ Erreur dans le processus d'enregistrement: ${error}`);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(`❌ Erreur: ${error}`);
    process.exit(1);
});