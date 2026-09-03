import { Publication } from "./publication.model";
import { ISearchStrategy } from "../base/search-strategy.interface";

export class FeedSearchEngine<T extends Publication> {
  constructor(private data: T[]) {}

  public execute(strategy: ISearchStrategy<T>): T[] {
    return strategy.sort(this.data);
  }
}
