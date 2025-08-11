import { ObjectId } from "mongodb";

export interface GitInfo {
   owner: string | null;
}

export interface Doc {
   _id: ObjectId,
   versions: any,
   gitInfo: GitInfo
}