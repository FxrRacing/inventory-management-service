import {Env} from "../interfaces";
const hasValidHeader= (request: Request, env: Env): boolean => {
    const requestHeader = request.headers.get('Authorization');
    if (!requestHeader|| !env.SHARED_SECRET) {
        return false;
    }

    const encoder = new TextEncoder();
    const userSecretKey = encoder.encode(requestHeader);
    const internalSecretKey = encoder.encode(env.SHARED_SECRET);

    //ensure the two keys are the same length
    if (userSecretKey.length !== internalSecretKey.length) {
        return false;
    }
//compare the two keys in a timing-safe manner
return crypto.subtle.timingSafeEqual(userSecretKey, internalSecretKey);
}

export  function authorizeRequest(request: Request, env: Env): boolean{
    const validMethods = ['GET', 'POST', 'PUT' ];
    if (validMethods.includes(request.method)){
        return hasValidHeader(request, env);
    }

    return false
}