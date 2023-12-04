
import {Env } from "../index";
async function postHandler(request: Request, env: Env): Promise<Response> {
	//this will call on the jsonProcess function and return the valid and invalid arrays
	//and then do something with them
    return new Response('Received a POST request');
}