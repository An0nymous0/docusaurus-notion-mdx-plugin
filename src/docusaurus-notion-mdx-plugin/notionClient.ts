import { Client, APIErrorCode } from '@notionhq/client';
import {
  ListBlockChildrenParameters,
  ListBlockChildrenResponse,
  QueryDatabaseParameters, QueryDatabaseResponse
} from "@notionhq/client/build/src/api-endpoints";

let notion: Client | null = null;

// Function to initialize the Notion client
export function initializeClient(auth: string): Client {
  if (!notion) {
    notion = new Client({ auth });
  }
  return notion;
}

// Function to fetch the children of a block
export async function fetchBlockChildren(param:ListBlockChildrenParameters): Promise<ListBlockChildrenResponse['results']> {
  try {
    //@ts-ignore
    const response = await notion.blocks.children.list(param);

    return response.results;
  } catch (error:any) {
    if (error.code === APIErrorCode.ObjectNotFound) {
      throw new Error(`Block ${param.block_id} not found`);
    }

    throw error;
  }
}


// Function to fetch the database
export async function fetchDatabase(param:QueryDatabaseParameters): Promise<QueryDatabaseResponse['results']> {
  try {
    //@ts-ignore
    const response = await notion.databases.query(param)

    return response.results;
  } catch (error:any) {
    if (error.code === APIErrorCode.ObjectNotFound) {
      throw new Error(`Database ${param.database_id} not found`);
    }

    throw error;
  }
}