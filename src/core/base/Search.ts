export type Comparator<T> = (a: T, b: T) => number;

class TrieNode<T> {
  children: Map<string, TrieNode<T>> = new Map();
  items: T[] = [];
}

export class Trie<T> {
  private root: TrieNode<T> = new TrieNode<T>();

  public insert(word: string, item: T): void {
    const text = Search.simplificarTexto(word);
    let node = this.root;
    for (const char of text) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode<T>());
      }
      node = node.children.get(char)!;
    }
    node.items.push(item);
  }

  public startsWith(prefix: string): T[] {
    const text = Search.simplificarTexto(prefix);
    let node = this.root;
    for (const char of text) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }
    return this.collectAll(node);
  }

  private collectAll(node: TrieNode<T>): T[] {
    let results: T[] = [...node.items];
    for (const child of node.children.values()) {
      results.push(...this.collectAll(child));
    }
    return results;
  }
}

export class Search<T> {
  private items: T[];

  constructor(items: T[]) {
    this.items = [...items];
  }

  public static simplificarTexto(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  public binarySearch(target: T, compare: Comparator<T>): T | null {
    let low = 0;
    let high = this.items.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const guess = this.items[mid];
      const comparison = compare(guess, target);
      if (comparison === 0) return guess;
      if (comparison > 0) high = mid - 1;
      else low = mid + 1;
    }
    return null;
  }

  public findPartials(query: string, extractor: (item: T) => string): T[] {
    const simplifiedQuery = Search.simplificarTexto(query);
    return this.items.filter((item) => {
      const itemText = Search.simplificarTexto(extractor(item));
      return itemText.includes(simplifiedQuery);
    });
  }

  public quickSort(array: T[] = this.items, compare: Comparator<T>): T[] {
    if (array.length < 2) return array;
    const pivotIndex = Math.floor(array.length / 2);
    const pivot = array[pivotIndex];
    const smaller = array.filter(
      (item, index) => index !== pivotIndex && compare(item, pivot) < 0,
    );
    const greater = array.filter(
      (item, index) => index !== pivotIndex && compare(item, pivot) >= 0,
    );
    return [
      ...this.quickSort(smaller, compare),
      pivot,
      ...this.quickSort(greater, compare),
    ];
  }
}
