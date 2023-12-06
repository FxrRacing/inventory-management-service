import {Env} from "../interfaces";

const hasValidHeader=(request: Request, env: Env): boolean => {
    const requestHeader = request.headers.get('X-Auth-Key');
    if (!requestHeader || env.SHARED_SECRET ) {
        return false;
    }
    const encoder = new TextEncoder();
    const internalSecretKey = encoder.encode(env.SHARED_SECRET);
    const userSecretKey = encoder.encode(requestHeader);

    if (userSecretKey.length !== internalSecretKey.length) {
        return false;
    }

    return crypto.subtle.timingSafeEqual(userSecretKey, internalSecretKey);
}

export function authorizeRequest(request: Request, env: Env): boolean {
    const validMethods = ['POST', 'GET'];
    if(validMethods.includes(request.method)) {
        return hasValidHeader(request, env);
    }

    return hasValidHeader(request, env);
}