export type Review = {
  id: string;
  product_id: string;
  product_name: string;
  author: string;
  content: string;
  rating: number;
  image_count: number;
  created_at: string;
  deleted_at: string | null;
  deletion_reason: string | null;
};
export type ReviewPage = {
  items: Review[];
  total: number;
  page: number;
  size: number;
};
export type MyReview = Pick<
  Review,
  | "id"
  | "content"
  | "rating"
  | "image_count"
  | "created_at"
  | "deleted_at"
  | "deletion_reason"
>;
