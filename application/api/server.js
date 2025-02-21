// land-registry/application/api/server.js
const express = require('express');
const bodyParser = require('body-parser');
const LandRegistryApp = require('../app');
const swagger = require('./swagger');

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Gestion des utilisateurs et authentification
 *   - name: Titles
 *     description: Gestion des titres fonciers
 *   - name: Sales
 *     description: Processus de vente
 *   - name: Liens
 *     description: Gestion des hypothèques
 *   - name: System
 *     description: Points d'accès système
 */

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use('/api-docs', swagger.serve, swagger.setup);

// Simulation des utilisateurs
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [seller, buyer, notary]
 */
const users = {
    'SELLER1': { id: 'SELLER1', name: 'Jean Dupont', role: 'seller' },
    'BUYER1': { id: 'BUYER1', name: 'Marie Martin', role: 'buyer' },
    'NOTARY1': { id: 'NOTARY1', name: 'Me Pierre Legrand', role: 'notary' }
};

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
    const userId = req.headers['user-id'];
    if (!userId || !users[userId]) {
        return res.status(401).json({
            error: true,
            message: 'Utilisateur non authentifié'
        });
    }
    req.user = users[userId];
    next();
};

let landRegistryApp;

const checkAppInitialized = async (req, res, next) => {
    try {
        if (!landRegistryApp) {
            landRegistryApp = new LandRegistryApp();
        }
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/seller/titles:
 *   post:
 *     summary: Créer un nouveau titre foncier
 *     tags: [Titles]
 *     security:
 *       - userId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titleId
 *               - location
 *               - area
 *               - propertyType
 *             properties:
 *               titleId:
 *                 type: string
 *               location:
 *                 type: string
 *               area:
 *                 type: number
 *               propertyType:
 *                 type: string
 *               maidsafeHash:
 *                 type: string
 *     responses:
 *       201:
 *         description: Titre créé avec succès
 *       400:
 *         description: Données invalides
 */
app.post('/api/seller/titles', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ error: true, message: 'Accès non autorisé' });
        }

        const { titleId, location, area, propertyType, maidsafeHash } = req.body;
        
        if (!titleId || !location || !area || !propertyType) {
            return res.status(400).json({
                error: true,
                message: 'Données manquantes'
            });
        }

        const result = await landRegistryApp.createLandTitle(
            req.user.id,
            titleId,
            location,
            area,
            propertyType,
            maidsafeHash || ''
        );
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/seller/titles/{titleId}/initiate-sale:
 *   post:
 *     summary: Mettre un titre en vente
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *             properties:
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Vente initiée
 */
app.post('/api/seller/titles/:titleId/initiate-sale', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ error: true, message: 'Accès non autorisé' });
        }

        const { titleId } = req.params;
        const { price } = req.body;

        if (!price || price <= 0) {
            return res.status(400).json({
                error: true,
                message: 'Prix invalide'
            });
        }

        const result = await landRegistryApp.initiateSale(req.user.id, titleId, price);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/seller/titles/{titleId}/approve:
 *   post:
 *     summary: Approbation du vendeur
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vente approuvée par le vendeur
 */
app.post('/api/seller/titles/:titleId/approve', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ error: true, message: 'Accès non autorisé' });
        }

        const { titleId } = req.params;
        const result = await landRegistryApp.approveAsSeller(req.user.id, titleId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/buyer/titles/{titleId}/make-offer:
 *   post:
 *     summary: Faire une offre d'achat
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offre soumise
 */
app.post('/api/buyer/titles/:titleId/make-offer', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        if (req.user.role !== 'buyer') {
            return res.status(403).json({ error: true, message: 'Accès non autorisé' });
        }

        const { titleId } = req.params;
        const result = await landRegistryApp.makePurchaseOffer(req.user.id, titleId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/buyer/titles/{titleId}/approve:
 *   post:
 *     summary: Approbation de l'acheteur
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vente approuvée par l'acheteur
 */
app.post('/api/buyer/titles/:titleId/approve', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        if (req.user.role !== 'buyer') {
            return res.status(403).json({ error: true, message: 'Accès non autorisé' });
        }

        const { titleId } = req.params;
        const result = await landRegistryApp.approveAsBuyer(req.user.id, titleId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/notary/titles/{titleId}/approve:
 *   post:
 *     summary: Approbation du notaire
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vente approuvée par le notaire
 */
app.post('/api/notary/titles/:titleId/approve', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        if (req.user.role !== 'notary') {
            return res.status(403).json({ error: true, message: 'Accès non autorisé' });
        }

        const { titleId } = req.params;
        const result = await landRegistryApp.approveAsNotary(req.user.id, titleId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/notary/titles/{titleId}/finalize:
 *   post:
 *     summary: Finaliser la vente
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vente finalisée
 */
app.post('/api/notary/titles/:titleId/finalize', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        if (req.user.role !== 'notary') {
            return res.status(403).json({ error: true, message: 'Accès non autorisé' });
        }

        const { titleId } = req.params;
        const result = await landRegistryApp.finalizeSale(req.user.id, titleId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/titles/{titleId}/liens:
 *   post:
 *     summary: Ajouter une hypothèque
 *     tags: [Liens]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lienHolder
 *               - amount
 *               - duration
 *             properties:
 *               lienHolder:
 *                 type: string
 *               amount:
 *                 type: number
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Hypothèque ajoutée
 */
app.post('/api/titles/:titleId/liens', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        const { titleId } = req.params;
        const { lienHolder, amount, duration } = req.body;

        if (!lienHolder || !amount || !duration) {
            return res.status(400).json({
                error: true,
                message: 'Données manquantes pour l\'hypothèque'
            });
        }

        const result = await landRegistryApp.addLien(
            req.user.id,
            titleId,
            lienHolder,
            amount,
            duration
        );
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/titles/{titleId}/liens/{lienId}:
 *   delete:
 *     summary: Supprimer une hypothèque
 *     tags: [Liens]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lienId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hypothèque supprimée
 */
app.delete('/api/titles/:titleId/liens/:lienId', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        const { titleId, lienId } = req.params;
        const result = await landRegistryApp.removeLien(req.user.id, titleId, lienId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/titles/{titleId}:
 *   get:
 *     summary: Obtenir les détails d'un titre
 *     tags: [Titles]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails du titre
 */
app.get('/api/titles/:titleId', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        const { titleId } = req.params;
        const result = await landRegistryApp.getLandTitle(req.user.id, titleId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/titles/owner/{owner}:
 *   get:
 *     summary: Obtenir les titres d'un propriétaire
 *     tags: [Titles]
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du propriétaire
 *     responses:
 *       200:
 *         description: Liste des titres du propriétaire
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Title'
 */
app.get('/api/titles/owner/:owner', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        const { owner } = req.params;
        const result = await landRegistryApp.queryTitlesByOwner(req.user.id, owner);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/titles/for-sale:
 *   get:
 *     summary: Obtenir tous les titres en vente
 *     tags: [Titles]
 *     responses:
 *       200:
 *         description: Liste des titres en vente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Title'
 */
app.get('/api/titles/for-sale', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        const result = await landRegistryApp.queryTitlesForSale(req.user.id);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/titles/{titleId}/history:
 *   get:
 *     summary: Obtenir l'historique d'un titre
 *     tags: [Titles]
 *     parameters:
 *       - in: path
 *         name: titleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du titre
 *     responses:
 *       200:
 *         description: Historique complet du titre
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       action:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                       actor:
 *                         type: string
 */
app.get('/api/titles/:titleId/history', [authMiddleware, checkAppInitialized], async (req, res, next) => {
    try {
        const { titleId } = req.params;
        const result = await landRegistryApp.getTitleHistory(req.user.id, titleId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Vérifier l'état de l'API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: État du système
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [UP, DOWN]
 *                 timestamp:
 *                   type: string
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtenir la liste des utilisateurs
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
app.get('/api/users', (req, res) => {
    const userList = Object.values(users).map(user => ({
        id: user.id,
        name: user.name,
        role: user.role
    }));
    res.json({ success: true, data: userList });
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Title:
 *       type: object
 *       properties:
 *         titleId:
 *           type: string
 *         owner:
 *           type: string
 *         location:
 *           type: string
 *         area:
 *           type: number
 *         propertyType:
 *           type: string
 *         status:
 *           type: string
 *         saleStatus:
 *           type: string
 *         maidsafeHash:
 *           type: string
 *         history:
 *           type: array
 *           items:
 *             type: object
 *         liens:
 *           type: array
 *           items:
 *             type: object
 *         dateCreated:
 *           type: string
 *         lastModified:
 *           type: string
 */

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).json({
        error: true,
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        error: true,
        message: 'Route non trouvée'
    });
});

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