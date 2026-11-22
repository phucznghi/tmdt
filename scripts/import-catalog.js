import {createApp} from '../server.js';
import {importUniqloCatalog} from '../catalog-import.js';
const app=createApp();try{console.log(importUniqloCatalog(app.db));}finally{app.close();}
