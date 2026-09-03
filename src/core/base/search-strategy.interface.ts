import { Publication } from "../models/publication.model";

export interface ISearchStrategy<T extends Publication> {
  sort(data: T[]): T[];
}
