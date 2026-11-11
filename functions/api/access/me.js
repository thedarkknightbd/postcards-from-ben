import {response,currentUser} from "../../_lib/access-auth.js";
export async function onRequestGet({request,env}){const user=await currentUser(request,env);return response({authenticated:!!user});}
