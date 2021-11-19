export interface OyuJsonNode {
  __filename?: string;
  slug: string;
  [key: string]: any;
  timeToRead: number;
  content: string;
}

export interface OyuJsonTypeMap {
  name: string;
  fields: {
    [key: string]: string | Record<string, any>;
  };
}
