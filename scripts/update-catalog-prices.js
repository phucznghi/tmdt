import {createApp} from '../server.js';
import {updateCatalogPrices} from '../catalog-import.js';
const app=createApp();try{console.log(updateCatalogPrices(app.db));}finally{app.close();}
