// land-registry/chaincode/lib/landRegistry.js
'use strict';

const { Contract } = require('fabric-contract-api');

class LandRegistry extends Contract {
    async InitLedger(ctx) {
        console.log('Initialisation du registre foncier');
        return true;
    }

    // Création d'un titre foncier
    async createLandTitle(ctx, titleId, owner, location, area, propertyType, maidsafeHash) {
        console.log('Début createLandTitle:', { titleId, owner, location, area, propertyType, maidsafeHash });

        const exists = await this.landTitleExists(ctx, titleId);
        if (exists) {
            throw new Error(`Le titre foncier ${titleId} existe déjà`);
        }

        const landTitle = {
            docType: 'landTitle',
            titleId,
            owner,
            location,
            area: parseFloat(area),
            propertyType,
            status: 'ACTIVE',
            maidsafeHash,
            saleStatus: 'NOT_FOR_SALE',
            history: [{
                action: 'CREATION',
                timestamp: new Date().toISOString(),
                actor: owner
            }],
            pendingSale: null,
            liens: [],
            dateCreated: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        console.log('Enregistrement du titre:', JSON.stringify(landTitle));
        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(landTitle)));
        return landTitle;
    }

    // Vérifier l'existence d'un titre
    async landTitleExists(ctx, titleId) {
        const titleBytes = await ctx.stub.getState(titleId);
        return titleBytes && titleBytes.length > 0;
    }

    // Obtenir un titre
    async getLandTitle(ctx, titleId) {
        console.log('getLandTitle:', titleId);
        const exists = await this.landTitleExists(ctx, titleId);
        if (!exists) {
            throw new Error(`Le titre foncier ${titleId} n'existe pas`);
        }
        const titleBytes = await ctx.stub.getState(titleId);
        return JSON.parse(titleBytes.toString());
    }

    // Mettre un titre en vente
    async initiateSale(ctx, titleId, seller, price) {
        console.log('initiateSale:', { titleId, seller, price });
        const title = await this.getLandTitle(ctx, titleId);
        
        if (title.owner !== seller) {
            throw new Error('Seul le propriétaire peut initier une vente');
        }

        if (title.saleStatus !== 'NOT_FOR_SALE') {
            throw new Error('Le titre est déjà en processus de vente');
        }

        if (title.liens.length > 0 && title.liens.some(lien => lien.status === 'ACTIVE')) {
            throw new Error('Le titre a des hypothèques actives');
        }

        title.saleStatus = 'FOR_SALE';
        title.pendingSale = {
            price: parseFloat(price),
            seller: seller,
            buyer: null,
            notaryApproval: false,
            sellerApproval: false,
            buyerApproval: false,
            initiatedAt: new Date().toISOString()
        };

        title.history.push({
            action: 'SALE_INITIATED',
            timestamp: new Date().toISOString(),
            actor: seller,
            price: price
        });

        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(title)));
        return title;
    }

    // Un acheteur fait une offre
    async makePurchaseOffer(ctx, titleId, buyer) {
        console.log('makePurchaseOffer:', { titleId, buyer });
        const title = await this.getLandTitle(ctx, titleId);
        
        if (title.saleStatus !== 'FOR_SALE') {
            throw new Error('Ce titre n\'est pas à vendre');
        }

        if (title.pendingSale.buyer) {
            throw new Error('Une offre est déjà en cours');
        }

        title.pendingSale.buyer = buyer;
        title.saleStatus = 'OFFER_PENDING';
        
        title.history.push({
            action: 'OFFER_MADE',
            timestamp: new Date().toISOString(),
            actor: buyer
        });

        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(title)));
        return title;
    }

    // Le notaire approuve la vente
    async approveAsNotary(ctx, titleId, notaryId) {
        console.log('approveAsNotary:', { titleId, notaryId });
        const title = await this.getLandTitle(ctx, titleId);
        
        if (title.saleStatus !== 'OFFER_PENDING') {
            throw new Error('Aucune offre en attente');
        }

        title.pendingSale.notaryApproval = true;
        title.history.push({
            action: 'NOTARY_APPROVAL',
            timestamp: new Date().toISOString(),
            actor: notaryId
        });

        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(title)));
        return title;
    }

    // Le vendeur approuve la vente
    async approveAsSeller(ctx, titleId, seller) {
        console.log('approveAsSeller:', { titleId, seller });
        const title = await this.getLandTitle(ctx, titleId);
        
        if (title.owner !== seller) {
            throw new Error('Seul le propriétaire peut approuver la vente');
        }

        title.pendingSale.sellerApproval = true;
        title.history.push({
            action: 'SELLER_APPROVAL',
            timestamp: new Date().toISOString(),
            actor: seller
        });

        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(title)));
        return title;
    }

    // L'acheteur approuve la vente
    async approveAsBuyer(ctx, titleId, buyer) {
        console.log('approveAsBuyer:', { titleId, buyer });
        const title = await this.getLandTitle(ctx, titleId);
        
        if (title.pendingSale.buyer !== buyer) {
            throw new Error('Seul l\'acheteur peut approuver la vente');
        }

        title.pendingSale.buyerApproval = true;
        title.history.push({
            action: 'BUYER_APPROVAL',
            timestamp: new Date().toISOString(),
            actor: buyer
        });

        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(title)));
        return title;
    }

    // Finaliser la vente
    async finalizeSale(ctx, titleId, notaryId) {
        console.log('finalizeSale:', { titleId, notaryId });
        const title = await this.getLandTitle(ctx, titleId);
        
        if (!title.pendingSale) {
            throw new Error('Aucune vente en cours');
        }

        if (!title.pendingSale.notaryApproval || 
            !title.pendingSale.sellerApproval || 
            !title.pendingSale.buyerApproval) {
            throw new Error('Toutes les approbations sont requises');
        }

        const oldOwner = title.owner;
        title.owner = title.pendingSale.buyer;
        title.saleStatus = 'NOT_FOR_SALE';
        title.history.push({
            action: 'SALE_FINALIZED',
            timestamp: new Date().toISOString(),
            actor: notaryId,
            oldOwner: oldOwner,
            newOwner: title.pendingSale.buyer,
            price: title.pendingSale.price
        });

        title.pendingSale = null;
        title.lastModified = new Date().toISOString();

        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(title)));
        return title;
    }

    // Ajouter une hypothèque
    async addLien(ctx, titleId, lienHolder, amount, duration) {
        console.log('addLien:', { titleId, lienHolder, amount, duration });
        const title = await this.getLandTitle(ctx, titleId);
        
        if (title.saleStatus !== 'NOT_FOR_SALE') {
            throw new Error('Impossible d\'ajouter une hypothèque pendant une vente');
        }

        const lien = {
            id: `LIEN_${Date.now()}`,
            holder: lienHolder,
            amount: parseFloat(amount),
            dateCreated: new Date().toISOString(),
            duration: parseInt(duration),
            status: 'ACTIVE'
        };

        title.liens.push(lien);
        title.history.push({
            action: 'LIEN_ADDED',
            timestamp: new Date().toISOString(),
            lienDetails: lien
        });

        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(title)));
        return title;
    }

    // Lever une hypothèque
    async removeLien(ctx, titleId, lienId) {
        console.log('removeLien:', { titleId, lienId });
        const title = await this.getLandTitle(ctx, titleId);
        
        const lienIndex = title.liens.findIndex(l => l.id === lienId);
        if (lienIndex === -1) {
            throw new Error('Hypothèque non trouvée');
        }

        title.liens[lienIndex].status = 'RELEASED';
        title.history.push({
            action: 'LIEN_RELEASED',
            timestamp: new Date().toISOString(),
            lienId: lienId
        });

        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(title)));
        return title;
    }

    // Rechercher les titres par propriétaire
    async queryTitlesByOwner(ctx, owner) {
        console.log('queryTitlesByOwner:', owner);
        const query = {
            selector: {
                docType: 'landTitle',
                owner: owner
            }
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const titles = [];
        let result = await iterator.next();
        while (!result.done) {
            titles.push(JSON.parse(result.value.value.toString()));
            result = await iterator.next();
        }
        return titles;
    }

    // Obtenir tous les titres en vente
    async queryTitlesForSale(ctx) {
        console.log('queryTitlesForSale');
        const query = {
            selector: {
                docType: 'landTitle',
                saleStatus: 'FOR_SALE'
            }
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const titles = [];
        let result = await iterator.next();
        while (!result.done) {
            titles.push(JSON.parse(result.value.value.toString()));
            result = await iterator.next();
        }
        return titles;
    }

    // Obtenir l'historique complet d'un titre
    async getTitleHistory(ctx, titleId) {
        console.log('getTitleHistory:', titleId);
        const exists = await this.landTitleExists(ctx, titleId);
        if (!exists) {
            throw new Error(`Le titre foncier ${titleId} n'existe pas`);
        }

        const iterator = await ctx.stub.getHistoryForKey(titleId);
        const history = [];
        let result = await iterator.next();
        while (!result.done) {
            const tx = result.value;
            history.push({
                txId: tx.txId,
                value: JSON.parse(tx.value.toString()),
                timestamp: tx.timestamp,
                isDelete: tx.isDelete
            });
            result = await iterator.next();
        }
        return history;
    }
}

module.exports = LandRegistry;