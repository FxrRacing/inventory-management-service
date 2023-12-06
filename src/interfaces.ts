export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
	SHARED_SECRET: string;
//
    STR_US_API_URL: string;
	STR_SE_API_URL: string;
	STR_CA_API_URL: string;
    STR_US_API_KEY: string;
	STR_SE_API_KEY: string;
	STR_CA_API_KEY: string;
	STR_WPG_API_KEY: string;
	STR_WPG_API_URL: string;
	STR_EDM_API_KEY: string;
	STR_EDM_API_URL: string;
	STR_FL_API_URL: string;
	STR_FL_API_KEY: string;
	STR_SASK_API_URL: string;
	STR_SASK_API_KEY: string;
	STR_NO_API_URL: string;
	STR_NO_API_KEY: string;
	/** Sentry DSN */
	SENTRY_DSN: string;

}