
import { getHandler } from "./handlers/getHandler";
import { postHandler } from "./handlers/postHandler";
import { Env } from "./index";
import { ExecutionContext } from "@cloudflare/workers-types/experimental";

export function createRouter() {
    const router = new Map<string, (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>>([
        ['POST', postHandler],
        ['GET', getHandler],
        // Add more routes as needed
    ]);
    return router;
}




export class Router{
    private router: Map<string, (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>>;
    constructor(){
        this.router = new Map<string, (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>>([
            ['POST', postHandler],
            ['GET', getHandler],
            // Add more routes as needed
        ]);
    }
   public getRouter(method: string){
        return this.router;
    }
}