import { FilterQuery } from "mongoose";
import { Order } from "../orderTypes";

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export const getPagination = (query: FilterQuery<Order>): PaginationOptions => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};
