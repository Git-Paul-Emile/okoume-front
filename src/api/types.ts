export type Id = string;

export type QueryParams = Record<string, string | number | boolean | undefined | null | Array<string | number>>;

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}
