
import {Env } from "../index";

async function getHandler(request: Request, env: Env): Promise<Response> {
    return new Response('Received a GET request');
}