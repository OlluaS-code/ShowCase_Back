import { Publication } from "../models/publication.model";

class PostNode<T extends Publication> {
  constructor(
    public data: T,
    public next: PostNode<T> | null = null,
  ) {}
}

export class SocialFeed<T extends Publication> {
  private head: PostNode<T> | null = null;
  private length: number = 0;

  public addToTop(post: T): void {
    const newNode = new PostNode(post);

    newNode.next = this.head;

    this.head = newNode;
    this.length++;
  }

  public toArray(): T[] {
    const posts: T[] = [];
    let current = this.head;

    while (current) {
      posts.push(current.data);
      current = current.next;
    }

    return posts;
  }

  public get count(): number {
    return this.length;
  }

  public clear(): void {
    this.head = null;
    this.length = 0;
  }
}
