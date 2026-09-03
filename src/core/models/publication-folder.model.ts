import { PublicationEntity } from "../../database/migrations/publication.entity";
import { Search, Trie } from "../base/Search";
import { ProjectCategory } from "./Enums";

export class PublicationFolder {
  private categories: Array<{
    titulo: ProjectCategory;
    itens: PublicationEntity[];
    trie: Trie<PublicationEntity>;
  }>;

  constructor() {
    this.categories = Object.values(ProjectCategory).map((cat) => ({
      titulo: cat,
      itens: [],
      trie: new Trie<PublicationEntity>(),
    }));
  }

  add(publication: PublicationEntity): void {
    const categoryGroup = this.categories.find(
      (c) => c.titulo === publication.category,
    );

    if (categoryGroup) {
      categoryGroup.itens.push(publication);

      categoryGroup.trie.insert(publication.title, publication);

      categoryGroup.itens.sort((a, b) =>
        Search.simplificarTexto(a.title).localeCompare(
          Search.simplificarTexto(b.title),
        ),
      );
    }
  }

  autoComplete(category: ProjectCategory, prefix: string): PublicationEntity[] {
    const group = this.categories.find((c) => c.titulo === category);
    return group ? group.trie.startsWith(prefix) : [];
  }

  findExact(
    category: ProjectCategory,
    exactTitle: string,
  ): PublicationEntity | null {
    const group = this.categories.find((c) => c.titulo === category);
    if (!group) return null;

    const searcher = new Search(group.itens);
    const target = { title: exactTitle } as PublicationEntity;

    return searcher.binarySearch(target, (a, b) =>
      Search.simplificarTexto(a.title).localeCompare(
        Search.simplificarTexto(b.title),
      ),
    );
  }
}
