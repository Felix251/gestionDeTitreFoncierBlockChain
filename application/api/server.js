// land-registry/application/api/server.js
const express = require('express');
const bodyParser = require('body-parser');
const LandRegistryApp = require('../app');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Instance de l'application Land Registry
let landRegistryApp;

// Middleware pour gérer les erreurs
const errorHandler = (err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).json({
        error: true,
        message: err.message,
        details: err.stack
    });
};

// Middleware pour vérifier que l'application est initialisée
const checkAppInitialized = async (req, res, next) => {
    try {
        if (!landRegistryApp) {
            landRegistryApp = new LandRegistryApp();
            await landRegistryApp.initialize();
        }
        next();
    } catch (error) {
        next(error);
    }
};

// Routes
app.post('/titles', checkAppInitialized, async (req, res, next) => {
    try {
        const { titleId, owner, location, area, propertyType, maidsafeHash } = req.body;
        
        // Validation des données
        if (!titleId || !owner || !location || !area || !propertyType) {
            return res.status(400).json({
                error: true,
                message: 'Données manquantes. Tous les champs sont obligatoires.'
            });
        }

        const result = await landRegistryApp.createLandTitle(
            titleId,
            owner,
            location,
            area,
            propertyType,
            maidsafeHash || ''
        );

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

app.get('/titles/:titleId', checkAppInitialized, async (req, res, next) => {
    try {
        const { titleId } = req.params;
        const result = await landRegistryApp.getLandTitle(titleId);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

app.get('/titles/owner/:owner', checkAppInitialized, async (req, res, next) => {
    try {
        const { owner } = req.params;
        const result = await landRegistryApp.queryTitlesByOwner(owner);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// Gestion des erreurs
app.use(errorHandler);

// Démarrage du serveur
const server = app.listen(port, () => {
    console.log(`API Land Registry démarrée sur le port ${port}`);
});

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
    console.log('Signal SIGTERM reçu. Arrêt du serveur...');
    await cleanup();
});

process.on('SIGINT', async () => {
    console.log('Signal SIGINT reçu. Arrêt du serveur...');
    await cleanup();
});

async function cleanup() {
    if (server) {
        server.close(() => {
            console.log('Serveur HTTP arrêté');
        });
    }
    if (landRegistryApp) {
        await landRegistryApp.disconnect();
        console.log('Déconnexion de la blockchain effectuée');
    }
    process.exit(0);
}

module.exports = app;