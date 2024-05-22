import { Env } from "../interfaces";
interface StoreConfig{
    storeUrl: string;
    storeKey: string;
}
type StoreDetails= {storeUrl: string, storeKey: string}| null;
function sanitizeString(str: string): string {
    return str.replace(/[^a-zA-Z \.,_-]/gi, '');
}


export function getStoreDetails(request: Request, env: Env, fallBackStore: string): StoreDetails{

    const storeName = sanitizeString(request.headers.get('x-store-name') || fallBackStore).toUpperCase();
    //console.log('this is the store that is sanitized: ' + storeName, 'this is the fallback store: ' + fallBackStore)
    const storeConfigMap: Record<string, StoreConfig> = {
        'US': {
            storeUrl: env.STR_US_API_URL,
            storeKey: env.STR_US_API_KEY,
        },
        'SE': {
            storeUrl: env.STR_SE_API_URL,
            storeKey: env.STR_SE_API_KEY,
        },
        'CA': {
            storeUrl: env.STR_CA_API_URL,
            storeKey: env.STR_CA_API_KEY,
        },
        'WPG': {
            storeUrl: env.STR_WPG_API_URL,
            storeKey: env.STR_WPG_API_KEY,
        },
        'EDM': {
            storeUrl: env.STR_EDM_API_URL,
            storeKey: env.STR_EDM_API_KEY,
        },
        'FL': {
            storeUrl: env.STR_FL_API_URL,
            storeKey: env.STR_FL_API_KEY,
        },
        'SASK': {
            storeUrl: env.STR_SASK_API_URL,
            storeKey: env.STR_SASK_API_KEY,
        },
        'NO':{
            storeUrl: env.STR_NO_API_URL,
            storeKey: env.STR_NO_API_KEY,
        }

    };
    return storeConfigMap[storeName] ;


}



export class StoreInitializer {
    private request: Request;
    private env: Env;
    private url: URL;
    private store: string;
    private endpoint: string;
    private storeContext: StoreDetails | undefined;

    constructor(request: Request, env: Env, region: string) {
        this.request = request;
        this.env = env;
        this.url = new URL(request.url);
        const pathDetails = this.extractPathDetails(this.url.pathname);
        this.store = pathDetails.store;
        this.endpoint = pathDetails.endpoint;
        this.storeContext = this.getStoreDetails(region);
    }

    private extractPathDetails(pathname: string): { store: string, endpoint: string } {
        // Implementation for extracting store and endpoint from the pathname
        // Return an object with store and endpoint properties
        const parts = pathname.split('/');
	return {
		store: parts[1] || '',
		endpoint: parts.length > 2 ? `/${parts[2]}` : pathname,
	};
    }

    private getStoreDetails(fallBackStore:string): StoreDetails | null {
        // Use this.request, this.env, and this.store as inputs
    const storeName = sanitizeString(this.request.headers.get('x-store-name') || fallBackStore).toUpperCase();
    console.log('this is the store that is sanitized: ' + storeName, 'this is the fallback store: ' + fallBackStore)
    const storeConfigMap: Record<string, StoreConfig> = {
        'US': {
            storeUrl: this.env.STR_US_API_URL,
            storeKey: this.env.STR_US_API_KEY,
        },
        'SE': {
            storeUrl: this.env.STR_SE_API_URL,
            storeKey: this.env.STR_SE_API_KEY,
        },
        'CA': {
            storeUrl: this.env.STR_CA_API_URL,
            storeKey: this.env.STR_CA_API_KEY,
        },
        'WPG': {
            storeUrl: this.env.STR_WPG_API_URL,
            storeKey: this.env.STR_WPG_API_KEY,
        },
        'EDM': {
            storeUrl: this.env.STR_EDM_API_URL,
            storeKey: this.env.STR_EDM_API_KEY,
        },
        'FL': {
            storeUrl: this.env.STR_FL_API_URL,
            storeKey: this.env.STR_FL_API_KEY,
        },
        'SASK': {
            storeUrl: this.env.STR_SASK_API_URL,
            storeKey: this.env.STR_SASK_API_KEY,
        },
        'NO':{
            storeUrl: this.env.STR_NO_API_URL,
            storeKey: this.env.STR_NO_API_KEY,
        }
        

    };
    return storeConfigMap[storeName] ?? null;
    }

    public initializeStoreContext(): StoreDetails | null {
        // Additional initialization logic if needed
        if (!this.storeContext) {
            return null;
        }
        return this.storeContext;
    }
}




/**
 *can i type for about 10 minsu
 */