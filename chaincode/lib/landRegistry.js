// land-registry/chaincode/lib/landRegistry.js
'use strict';

const { Contract } = require('fabric-contract-api');

class LandRegistry extends Contract {
    async InitLedger(ctx) {
        console.log('Initialisation du registre foncier');
        return true;
    }

    async createLandTitle(ctx, titleId, owner, location, area, propertyType, maidsafeHash) {
        console.log('Début createLandTitle');
        
        const exists = await this.landTitleExists(ctx, titleId);
        if (exists) {
            throw new Error(`Le titre foncier ${titleId} existe déjà`);
        }

        const landTitle = {
            docType: 'landTitle',  // Important pour CouchDB
            titleId,
            owner,
            location,
            area: parseFloat(area),
            propertyType,
            status: 'ACTIVE',
            maidsafeHash,
            history: [{
                action: 'CREATION',
                timestamp: new Date().toISOString(),
                actor: owner
            }],
            liens: [],
            dateCreated: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        // Convertir en JSON et stocker
        await ctx.stub.putState(titleId, Buffer.from(JSON.stringify(landTitle)));
        console.log('Titre foncier créé:', titleId);
        return landTitle;
    }

    async landTitleExists(ctx, titleId) {
        const titleBytes = await ctx.stub.getState(titleId);
        return titleBytes && titleBytes.length > 0;
    }

    async getLandTitle(ctx, titleId) {
        const exists = await this.landTitleExists(ctx, titleId);
        if (!exists) {
            throw new Error(`Le titre foncier ${titleId} n'existe pas`);
        }
        const titleBytes = await ctx.stub.getState(titleId);
        return JSON.parse(titleBytes.toString());
    }

    async queryTitlesByOwner(ctx, owner) {
        const queryString = {
            selector: {
                docType: 'landTitle',
                owner: owner
            }
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const titles = [];
        let result = await iterator.next();
        while (!result.done) {
            titles.push(JSON.parse(result.value.value.toString()));
            result = await iterator.next();
        }
        return titles;
    }
}

module.exports = LandRegistry;