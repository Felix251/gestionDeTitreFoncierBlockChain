// land-registry/application/verify.js
const LandRegistryApp = require('./app');
const fs = require('fs');
const path = require('path');

async function verifyTransaction(titleId) {
    const app = new LandRegistryApp();
    try {
        // Initialiser avec un utilisateur
        await app.initialize('SELLER1');

        // 1. Vérifier l'état actuel
        console.log('\n1. État actuel du titre:');
        const currentState = await app.getLandTitle('SELLER1', titleId);
        console.log(JSON.stringify(currentState, null, 2));

        // 2. Vérifier l'historique
        console.log('\n2. Historique des transactions:');
        const history = await app.getTitleHistory('SELLER1', titleId);
        console.log('Nombre total de transactions:', history.length);
        history.forEach((tx, index) => {
            console.log(`\nTransaction ${index + 1}:`);
            console.log('- ID:', tx.txId);
            console.log('- Timestamp:', tx.timestamp);
            console.log('- Type:', tx.value.docType);
            console.log('- Action:', tx.value.history[0].action);
        });

        // 3. Vérifier les changements de propriétaire
        console.log('\n3. Changements de propriétaire:');
        const ownerChanges = history.filter(tx => 
            tx.value.history.some(h => h.action === 'TRANSFER' || h.action === 'SALE_FINALIZED')
        );
        ownerChanges.forEach(tx => {
            const change = tx.value.history.find(h => h.action === 'TRANSFER' || h.action === 'SALE_FINALIZED');
            console.log(`- De: ${change.oldOwner} à: ${change.newOwner}`);
            console.log(`  Date: ${tx.timestamp}`);
        });

        // 4. Vérifier les hypothèques
        console.log('\n4. Hypothèques:');
        if (currentState.liens && currentState.liens.length > 0) {
            currentState.liens.forEach(lien => {
                console.log('- ID:', lien.id);
                console.log('  Montant:', lien.amount);
                console.log('  Statut:', lien.status);
            });
        } else {
            console.log('Aucune hypothèque active');
        }

    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
    } finally {
        await app.disconnect();
    }
}

// Utilisation
if (require.main === module) {
    const titleId = process.argv[2];
    if (!titleId) {
        console.log('Usage: node verify.js TITLE_ID');
        process.exit(1);
    }
    verifyTransaction(titleId);
}

module.exports = verifyTransaction;